import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server.js';
import {staffScanAllowed,staffTokenFromQr} from './staff-pass.mjs';
import {memberToday} from './members.mjs';
import {recordGymScan} from './admin-recent-activity.js';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function staffPassImage(user,sql){
 if(!['manager','supervisor'].includes(user.role)||!user.location_id)return reply({error:'Assigned staff access required'},403);
 const [pass]=await sql`INSERT INTO staff_gate_passes(user_id,token) VALUES(${user.id},${randomBytes(32).toString('hex')}) ON CONFLICT(user_id) DO UPDATE SET user_id=excluded.user_id RETURNING token`;
 const {QRCodeWriter,BarcodeFormat,EncodeHintType}=await import('@zxing/library');const {default:sharp}=await import('sharp');
 const matrix=new QRCodeWriter().encode(JSON.stringify({type:'gym-staff-pass',version:1,token:pass.token}),BarcodeFormat.QR_CODE,640,640,new Map([[EncodeHintType.ERROR_CORRECTION,'M']]));const width=matrix.getWidth(),height=matrix.getHeight(),pixels=Buffer.alloc(width*height,255);for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(matrix.get(x,y))pixels[y*width+x]=0;
 return new Response(await sharp(pixels,{raw:{width,height,channels:1}}).png().toBuffer(),{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store'}});
}
export async function scanStaffPass(qr,user,sql){
 const token=staffTokenFromQr(qr);if(!token)return null;
 const [target]=await sql`SELECT u.id,u.public_id,u.name,u.role,u.created_by,u.location_id FROM staff_gate_passes p JOIN users u ON u.id=p.user_id WHERE p.token=${token} AND u.archived_at IS NULL AND gym_account_enabled(u.id) AND u.created_by=${user.created_by} AND u.location_id=${user.location_id}`;
 if(!target||!staffScanAllowed(user,target)){const error=target?.id===user.id?'You cannot scan your own QR':'This staff QR is not permitted in your assigned gym location';await recordGymScan(sql,user,{result:'Rejected',reason:error,staffId:target?.id||null});return reply({error},403);}
 const date=memberToday();
 const [row]=await sql`INSERT INTO staff_attendance(user_id,admin_id,location_id,attended_on,marked_by) SELECT id,created_by,location_id,${date}::date,${user.id} FROM users WHERE id=${target.id} AND archived_at IS NULL AND gym_account_enabled(id) AND created_by=${user.created_by} AND location_id=${user.location_id} ON CONFLICT(user_id,attended_on) DO UPDATE SET last_out_at=now(),marked_by=excluded.marked_by WHERE staff_attendance.admin_id=excluded.admin_id AND staff_attendance.location_id=excluded.location_id AND COALESCE(staff_attendance.last_out_at,staff_attendance.first_in_at)<=now()-INTERVAL '60 seconds' RETURNING first_in_at,last_out_at`;
 const [stored]=row?[row]:await sql`SELECT first_in_at,last_out_at FROM staff_attendance WHERE user_id=${target.id} AND admin_id=${user.created_by} AND location_id=${user.location_id} AND attended_on=${date}::date`;
 if(!stored)return reply({error:'Staff assignment changed. Scan again.'},409);
 await recordGymScan(sql,user,{staffId:target.id,result:'Accepted',reason:row?(row.last_out_at?'Last out recorded':'First in recorded'):'Duplicate scan ignored'});
 return reply({markedPresent:true,alreadyPresent:!row,timingUpdated:!!row,date,firstIn:stored.first_in_at,lastOut:stored.last_out_at,membershipStatus:'Active',member:{id:target.id,memberId:target.public_id,name:target.name,plan:target.role,staff:true}});
}
