import {recordGymScan} from './admin-recent-activity.js';
import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server.js';
import {memberToday} from './members.mjs';
import {gatePassTokenFromQr,gatePassStatus,renewalMessage} from './gate-pass.mjs';
import {renderGatePass} from './gate-pass-image.mjs';
import {whatsappConfiguration,sendGatePassToWhatsApp} from './whatsapp-cloud.mjs';

const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status)=>reply({error},status);
export async function gatePassApi(action,request,user,sql) {
 if(action==='gate-pass-scan') {
  if(request.method!=='POST')return fail('Method not allowed',405);
  if(user.role!=='supervisor')return fail('Supervisor access required',403);
  if(!user.location_id)return fail('Ask your gym admin to assign your location',403);
  const scanReply=async(data,status=200,memberId=null)=>{await recordGymScan(sql,user,{memberId,result:data.markedPresent?'Accepted':'Rejected',reason:data.error||(data.markedPresent?(data.timingUpdated?(data.lastOut?'Last out recorded':'First in recorded'):'Duplicate scan ignored'):data.membershipStatus==='Expired'?'Membership expired':'Membership inactive')});return reply(data,status);};
  const body=await request.json(),token=gatePassTokenFromQr(body.qr);
  if(!token)return scanReply({error:'Scan a valid gym gate-pass QR code'},400);
  const [member]=await sql`SELECT m.id,m.public_id,m.name,m.plan,m.status,(SELECT COALESCE(NULLIF(gym_phone,''),phone) FROM users WHERE id=m.admin_id) AS gym_phone,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,EXISTS(SELECT 1 FROM member_pictures p WHERE p.member_id=m.id) AS has_photo FROM member_gate_passes g JOIN members m ON g.member_id=m.id WHERE m.archived_at IS NULL AND g.token=${token} AND m.admin_id=${user.created_by} AND m.location_id=${user.location_id}`;
  if(!member)return scanReply({error:'Gate pass not found in your assigned gym location'},404);
  const date=memberToday(),membershipStatus=gatePassStatus(member,date);
  const result={gymPhone:member.gym_phone||'',member:{id:member.id,memberId:member.public_id,name:member.name,plan:member.plan,validFrom:member.valid_from,validTo:member.valid_to,profilePictureUrl:member.has_photo?'/api/member-photo?id='+member.id:null},date,membershipStatus,renewalMessage:renewalMessage(member,date)};
  if(membershipStatus!=='Active')return scanReply({...result,markedPresent:false},200,member.id);
  const marked=await sql`INSERT INTO attendance(member_id,attended_on,status,marked_by,source,first_in_at) SELECT m.id,${date}::date,'Present',${user.id},'qr',NOW() FROM members m JOIN member_gate_passes g ON g.member_id=m.id WHERE m.archived_at IS NULL AND g.token=${token} AND m.id=${member.id} AND m.admin_id=${user.created_by} AND m.location_id=${user.location_id} AND m.status='Active' AND m.valid_from<=${date}::date AND m.valid_to>=${date}::date ON CONFLICT(member_id,attended_on) DO UPDATE SET status='Present',source='qr',marked_by=EXCLUDED.marked_by,updated_at=NOW(),first_in_at=COALESCE(attendance.first_in_at,NOW()),last_out_at=CASE WHEN attendance.first_in_at IS NOT NULL THEN NOW() ELSE NULL END WHERE attendance.status<>'Present' OR attendance.source<>'qr' OR attendance.first_in_at IS NULL OR COALESCE(attendance.last_out_at,attendance.first_in_at)<=NOW()-INTERVAL '60 seconds' RETURNING id`;
  const [attendance]=await sql`SELECT a.id,a.first_in_at,a.last_out_at FROM attendance a JOIN members m ON m.id=a.member_id JOIN member_gate_passes g ON g.member_id=m.id WHERE m.archived_at IS NULL AND g.token=${token} AND m.id=${member.id} AND m.admin_id=${user.created_by} AND m.location_id=${user.location_id} AND m.status='Active' AND m.valid_from<=${date}::date AND m.valid_to>=${date}::date AND a.attended_on=${date}::date AND a.status='Present' AND a.source='qr'`;
  if(!attendance)return scanReply({error:'Membership changed. Scan the gate pass again.'},409,member.id);
  return scanReply({...result,markedPresent:true,alreadyPresent:marked.length===0,timingUpdated:marked.length>0,firstIn:attendance.first_in_at,lastOut:attendance.last_out_at},200,member.id);
 }
 if(!['superadmin','admin','manager'].includes(user.role))return fail('Admin access required',403);
 if(action==='gate-pass'&&request.method!=='GET'||action==='whatsapp-gate-pass'&&request.method!=='POST')return fail('Method not allowed',405);
 const body=action==='whatsapp-gate-pass'?await request.json():{};
 const id=action==='gate-pass'?Number(new URL(request.url).searchParams.get('id')):body.id;
 if(!Number.isInteger(id)||id<1||id>2147483647)return fail('Invalid member',400);
 const [member]=await sql`SELECT m.id,m.public_id,m.name,m.phone,m.plan,m.status,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,COALESCE(NULLIF(owner.gym_name,''),owner.name) AS gym_name,owner.gym_logo,owner.gym_address,COALESCE(NULLIF(owner.gym_phone,''),owner.phone) AS gym_phone,owner.gym_website,p.data AS photo FROM members m JOIN users owner ON owner.id=m.admin_id LEFT JOIN member_pictures p ON p.member_id=m.id WHERE m.archived_at IS NULL AND gym_account_enabled(owner.id) AND m.id=${id} AND (${user.role}='superadmin' OR m.admin_id=${user.role==='manager'?user.created_by:user.id}) AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null})`;
 if(!member)return fail('Member not found',404);
 const configuration=action==='whatsapp-gate-pass'?whatsappConfiguration():null;
 if(action==='whatsapp-gate-pass'&&!configuration)return fail('WhatsApp is not configured. Add WAPMONKEY_API_KEY, WAPMONKEY_DEVICE_TOKEN and APP_URL on the server.',503);
 const [pass]=await sql`INSERT INTO member_gate_passes(member_id,token) VALUES(${id},${randomBytes(32).toString('hex')}) ON CONFLICT(member_id) DO UPDATE SET member_id=EXCLUDED.member_id RETURNING token`;
 if(action==='gate-pass')return new Response(await renderGatePass(member,pass.token),{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store','Content-Disposition':`inline; filename="${member.public_id}-gate-pass.png"`}});
 if(typeof body.requestKey!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(body.requestKey))return fail('Invalid send request',400);
 let [message]=await sql`INSERT INTO whatsapp_gate_pass_messages(member_id,requested_by,request_key,status) VALUES(${id},${user.id},${body.requestKey},'sending') ON CONFLICT(requested_by,request_key) DO NOTHING RETURNING id`;
 if(!message){
  const [existing]=await sql`SELECT member_id,status,message_id FROM whatsapp_gate_pass_messages WHERE requested_by=${user.id} AND request_key=${body.requestKey}`;
  if(existing?.member_id===id&&existing.status==='accepted')return reply({accepted:true,messageId:existing.message_id});
  return fail('This send request is already recorded. Check your WhatsApp provider dashboard before sending again.',409);
 }
 try{
  const image=await renderGatePass(member,pass.token);
  const sent=await sendGatePassToWhatsApp(member,image,{configuration});
  await sql`UPDATE whatsapp_gate_pass_messages SET status='accepted',message_id=${sent.messageId} WHERE id=${message.id}`;
  return reply({accepted:true,messageId:sent.messageId});
 }catch(error){
  const unknown=error.code==='DELIVERY_UNKNOWN'||!['UPLOAD_REJECTED','MESSAGE_REJECTED','INVALID_PHONE','NOT_CONFIGURED','CONFIGURATION'].includes(error.code);
  await sql`UPDATE whatsapp_gate_pass_messages SET status=${unknown?'unknown':'failed'} WHERE id=${message.id}`;
  return fail(unknown?'Delivery status is unknown. Check your WhatsApp provider dashboard before sending again.':error.message,502);
 }
}
