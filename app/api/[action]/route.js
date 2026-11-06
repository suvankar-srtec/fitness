import {videoApi} from '../../../lib/video-api';
import {memberLogin,memberSession} from '../../../lib/member-auth';
import {memberPhoneAuthApi} from '../../../lib/member-phone-auth-api';
import {phoneAuthApi} from '../../../lib/phone-auth-api';
import {loginPhone} from '../../../lib/phone-auth.mjs';
import {normalizeGymBranding} from '../../../lib/gym-branding.mjs';
import {sessionProfile} from '../../../lib/session-profile.mjs';
import {managerApi} from '../../../lib/manager-api';
import {managerSupervisors} from '../../../lib/manager-supervisors';
import {auditCredentialDelivery} from '../../../lib/audit-delivery.mjs';
import {withAuditActor} from '../../../lib/audit-database.mjs';
import {auditApi} from '../../../lib/audit-api';
import {sendWapMonkeyInvitation} from '../../../lib/wapmonkey.mjs';
import {whatsappConfiguration} from '../../../lib/whatsapp-cloud.mjs';
import {resolveGymLocation,normalizeLocationName} from '../../../lib/gym-locations.mjs';
import {gatePassApi} from '../../../lib/gate-pass-api';
import { PAYMENT_MODES } from '../../../lib/payments.mjs';
import { isMainSuperadmin, canCreateGymAdmin } from '../../../lib/user-permissions.mjs';
import { publicUser } from '../../../lib/user-profile.mjs';
import { attendanceApi } from '../../../lib/attendance-api';
import { membershipApi } from '../../../lib/membership-api';
import { validateMember, ageFromDateOfBirth, memberToday } from '../../../lib/members.mjs';
import { normalizeMemberPicture } from '../../../lib/member-picture.mjs';
import { validatePlan } from '../../../lib/plans.mjs';
import { normalizeWhatsAppPhone } from '../../../lib/whatsapp.mjs';
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { database } from '../../../lib/db';
import { hashPassword, verifyPassword, tokenHash } from '../../../lib/password.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status)=>response({error},status);
async function handle(req,context) {
try {
 const {action}=await context.params;
 if(!['videos','video-stream','member-login','member-pass','member-otp-request','member-otp-verify','member-otp-set-password','otp-request','otp-verify','otp-set-password','manager-registration','managers','manager-dashboard','audit','gym-locations','supervisor-summary','gate-pass','gate-pass-scan','whatsapp-gate-pass','login','logout','me','superadmins','admins','members','supervisors','credentials','plans','member-photo','member-registration','memberships','membership-payments','users','attendance'].includes(action))return fail('Not found',404);
 if(['POST','PATCH','DELETE'].includes(req.method)) {const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return fail('Invalid origin',403);}
 let sql=database();
 if(action.startsWith('member-otp-'))return await memberPhoneAuthApi(action.slice(7),req,sql);
 if(action==='member-login'&&req.method==='POST')return await memberLogin(req,sql);
 if(['otp-request','otp-verify','otp-set-password'].includes(action))return await phoneAuthApi(action,req,sql);
 if(action==='login'&&req.method==='POST') {
  const b=await req.json();if(typeof b.password!=='string'||!b.password)return fail('Enter your mobile number and password',400);
  const root=typeof b.userId==='string'&&b.userId.trim().toLowerCase()==='sp00';
  const phone=root?null:loginPhone(b.phone,b.country);if(!root&&!phone)return fail('Enter a valid mobile number',400);
  const key=tokenHash(root?'sp00':phone);
  const [[attempt],users]=await Promise.all([sql`INSERT INTO login_attempts(key,attempts) VALUES(${key},1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN 1 ELSE login_attempts.attempts+1 END,started_at=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN NOW() ELSE login_attempts.started_at END RETURNING attempts`,root?sql`SELECT *,gym_account_enabled(id) AS account_enabled FROM users WHERE public_id='sp00' AND role='superadmin'`:sql`SELECT u.*,gym_account_enabled(u.id) AS account_enabled,CASE WHEN u.role IN ('manager','supervisor') THEN (SELECT COALESCE(NULLIF(gym_name,''),name) FROM users WHERE id=u.created_by AND role='admin') ELSE u.gym_name END AS gym_name,(SELECT name FROM gym_locations WHERE id=u.location_id) AS location_name FROM users u JOIN account_phone_registry r ON r.source_table='users' AND r.record_id=u.id AND r.phone=u.phone WHERE u.phone=${phone} AND u.role IN ('admin','manager','supervisor')`]);
  if(attempt.attempts>30)return fail('Too many attempts. Try again in 10 minutes.',429);
  const u=users[0];if(!u||!u.account_enabled)return fail('Invalid mobile number or password',401);
  if(!root&&!u.password_ready)return response({error:'Verify your WhatsApp number and set your password first.',code:'PASSWORD_SETUP_REQUIRED'},403);
  if(root&&!isMainSuperadmin(publicUser(u))||!await verifyPassword(b.password,u.password))return fail('Invalid mobile number or password',401);
  if(['manager','supervisor'].includes(u.role)&&(!u.created_by||!u.location_id||!normalizeLocationName(u.location_name)||!u.gym_name))return fail('Ask your gym admin to assign your gym and location',403);
  sql=withAuditActor(sql,u);
  const token=randomBytes(32).toString('hex');
  await sql.transaction([sql`DELETE FROM login_attempts WHERE key=${key}`,sql`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(${tokenHash(token)},${u.id},NOW()+(28800*INTERVAL '1 second'))`]);
  const result=response(sessionProfile(u));result.cookies.set('session',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:28800});return result;
 }
 const token=req.cookies.get('session')?.value;if(!token)return fail('Please sign in',401);
 if(token.startsWith('m.')){const memberResponse=await memberSession(action,req,sql,token);return memberResponse||fail('Please sign in',401);}
 const [u]=await sql`SELECT u.*,gym_account_enabled(u.id) AS account_enabled,(SELECT name FROM gym_locations WHERE id=u.location_id) AS location_name,CASE WHEN u.role IN ('manager','supervisor') THEN (SELECT COALESCE(NULLIF(gym_name,''),name) FROM users WHERE id=u.created_by AND role='admin') ELSE u.gym_name END AS gym_name FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=${tokenHash(token)} AND s.expires_at>NOW()`;
 if(!u||!u.account_enabled||u.role==='superadmin'&&!isMainSuperadmin(publicUser(u)))return fail('Please sign in',401);
 if(u.role!=='superadmin'&&!u.password_ready)return fail('Verify your WhatsApp number and set your password.',401);
 sql=withAuditActor(sql,u);
 if(u.role==='manager'&&!['me','logout','manager-dashboard','supervisors','attendance','credentials','member-photo'].includes(action))return fail('Manager access is limited to your assigned location',403);
 if(['manager-registration','managers','manager-dashboard'].includes(action))return await managerApi(action,req,u,sql);
 if(['videos','video-stream'].includes(action))return await videoApi(action,req,u,sql);
 if(action==='supervisors'&&u.role==='manager')return await managerSupervisors(req,u,sql);
 if(action==='audit')return await auditApi(req,u,sql);
 if(['gate-pass','gate-pass-scan','whatsapp-gate-pass'].includes(action))return await gatePassApi(action,req,u,sql);
 if(action==='gym-locations'){
  if(req.method!=='GET')return fail('Method not allowed',405);
  if(!['superadmin','admin'].includes(u.role))return fail('Admin access required',403);
  const adminId=Number(new URL(req.url).searchParams.get('adminId')||(u.role==='admin'?u.id:0));
  if(!Number.isInteger(adminId)||adminId<1||adminId>2147483647)return fail('Select a gym',400);
  if(u.role==='admin'&&adminId!==u.id)return fail('Access denied',403);
  const [gym]=await sql`SELECT id FROM users WHERE archived_at IS NULL AND id=${adminId} AND role='admin'`;if(!gym)return fail('Gym not found',404);
  return response(await sql`SELECT id,name FROM gym_locations WHERE admin_id=${adminId} AND lower(trim(name))<>'main location' ORDER BY lower(name)`);
 }
 if(action==='supervisor-summary'){
  if(!u.location_id)return fail('Ask your gym admin to assign your location',403);
  if(req.method!=='GET')return fail('Method not allowed',405);
  if(u.role!=='supervisor')return fail('Supervisor access required',403);
  const today=memberToday();
  const [summary]=await sql`SELECT count(*)::int AS "totalMembers",count(*) FILTER(WHERE joined>=date_trunc('month',${today}::date)::date AND joined<=${today}::date)::int AS "joinedThisMonth" FROM members WHERE archived_at IS NULL AND admin_id=${u.created_by} AND location_id=${u.location_id}`;
  return response(summary);
 }
 if(action==='attendance')return await attendanceApi(req,u,sql);
 if(['memberships','membership-payments'].includes(action))return await membershipApi(action,req,u,sql);
 if(action==='me'&&req.method==='GET')return response(sessionProfile(u));
 if(action==='logout'&&req.method==='POST'){await sql`DELETE FROM sessions WHERE token_hash=${tokenHash(token)}`;const result=response({ok:true});result.cookies.set('session','',{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});return result;}
 if(action==='credentials'&&req.method==='POST'){
  const b=await req.json();if(!Number.isInteger(b.id))return fail('Invalid account',400);
  const [target]=u.role==='superadmin'?await sql`SELECT * FROM users WHERE id=${b.id} AND role IN ('admin','manager','supervisor')`:u.role==='admin'?await sql`SELECT * FROM users WHERE id=${b.id} AND role='manager' AND created_by=${u.id}`:u.role==='manager'?await sql`SELECT * FROM users WHERE id=${b.id} AND role='supervisor' AND created_by=${u.created_by} AND location_id=${u.location_id}`:[];
  if(!target)return fail('Access denied',403);
  const key=tokenHash('credentials:'+u.id+':'+target.id);
  const [attempt]=await sql`INSERT INTO login_attempts(key,attempts) VALUES(${key},1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN 1 ELSE login_attempts.attempts+1 END,started_at=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN NOW() ELSE login_attempts.started_at END RETURNING attempts`;
  if(attempt.attempts>30)return fail('Too many attempts. Try again later.',429);
  await sql`DELETE FROM login_attempts WHERE key=${key}`;
  const configuration=whatsappConfiguration();
  if(!configuration||configuration.provider!=='wapmonkey')return fail('Configure WAPMONKEY_API_KEY, WAPMONKEY_DEVICE_TOKEN and APP_URL in Vercel',503);
  if(typeof b.requestKey!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestKey))return fail('Invalid send request',400);
  const sendKey=tokenHash('credential-send:'+u.id+':'+b.requestKey);
  const claimed=await sql`INSERT INTO login_attempts(key,attempts) VALUES(${sendKey},1) ON CONFLICT(key) DO NOTHING RETURNING key`;
  if(!claimed.length)return fail('This send request is already recorded. Check WapMonkey before sending again.',409);
  let sent;
  try{sent=await sendWapMonkeyInvitation(publicUser(target),{configuration});}
  catch(error){await auditCredentialDelivery(sql,u,target,error.code==='DELIVERY_UNKNOWN'?'SEND_UNKNOWN':'SEND_FAILED');return fail(error.message||'WhatsApp delivery could not be confirmed. Check WapMonkey before retrying.',502);}
  await auditCredentialDelivery(sql,u,target,'SEND_ACCEPTED',sent.messageId);return response({accepted:true,messageId:sent.messageId});
 }
 if(action==='users'||action==='supervisors'&&req.method==='PATCH'){
  const ownSupervisor=action==='supervisors'&&u.role==='admin';
  if(u.role!=='superadmin'&&!ownSupervisor)return fail('Superadmin access required',403);
  if(!['PATCH','DELETE'].includes(req.method))return fail('Method not allowed',405);
  const b=await req.json();if(!Number.isInteger(b.id)||b.id<1||b.id>2147483647)return fail('Invalid user',400);
  const [target]=await sql`SELECT id,role,phone,created_by,location_id FROM users WHERE id=${b.id}`;if(!target)return fail('User not found',404);
  if(action==='supervisors'&&(target.role!=='supervisor'||ownSupervisor&&target.created_by!==u.id))return fail('Supervisor not found',404);
  if(ownSupervisor&&b.gymAdminId!==undefined&&Number(b.gymAdminId)!==u.id)return fail('Supervisors must remain in your gym',403);
  if(target.role==='superadmin'&&!isMainSuperadmin(publicUser(u))&&target.id!==u.id)return fail('Only sp00 can manage other superadmins',403);
  if(req.method==='DELETE'){
   if(target.role==='superadmin')return fail('The superadmin account cannot be deleted',403);
   if(target.role==='manager')return fail('Only the gym admin can delete this manager',403);
   await sql`UPDATE users SET archived_at=NOW() WHERE id=${b.id} AND role IN ('admin','supervisor') AND archived_at IS NULL`;return response({ok:true});
  }
  if(typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>100)return fail('Enter a name',400);
  const phone=b.phone===''&&target.role==='superadmin'?'':normalizeWhatsAppPhone(target.role==='admin'?b.gymPhone:b.phone,target.role==='admin'?b.gymCountry:b.country);if(phone===null)return fail('Invalid phone number',400);
  if(target.role==='admin'&&(typeof b.gymName!=='string'||!b.gymName.trim()||b.gymName.trim().length>100))return fail('Enter a gym name',400);
  const branding=target.role==='admin'?normalizeGymBranding(b):null;
  let gymAdminId=target.created_by,assignedLocation=null;
  if(target.role==='supervisor'){
   gymAdminId=Number(b.gymAdminId??target.created_by);
   if(!Number.isInteger(gymAdminId)||gymAdminId<1)return fail('Select a gym',400);
   const [gym]=await sql`SELECT id FROM users WHERE archived_at IS NULL AND id=${gymAdminId} AND role='admin'`;
   if(!gym)return fail('Select a valid gym',400);
   assignedLocation=await resolveGymLocation(sql,gymAdminId,b.locationName!==undefined||b.locationId!==undefined?b:{locationId:gymAdminId===target.created_by?target.location_id:null});
  }
  if(b.password!==undefined&&typeof b.password!=='string')return fail('Invalid password',400);
  if(target.role!=='superadmin'&&b.password)return fail('Users set their own password through WhatsApp verification',400);
  const password=target.role==='superadmin'&&b.password?await hashPassword(b.password):null;
  const gymLogo=target.role==='admin'&&b.gymLogo!==undefined?await normalizeMemberPicture(b.gymLogo):null;
  if(target.role==='admin'&&!gymLogo)return fail('Upload a gym logo',400);
  const [updated]=await sql.transaction([
   sql`UPDATE users SET name=${b.name.trim()},phone=${phone},gym_address=CASE WHEN role='admin' THEN ${branding?.address||''} ELSE gym_address END,gym_phone=CASE WHEN role='admin' THEN ${branding?.phone||''} ELSE gym_phone END,gym_website=CASE WHEN role='admin' THEN ${branding?.website||''} ELSE gym_website END,location_id=CASE WHEN role='supervisor' THEN ${assignedLocation?.id||null} ELSE location_id END,gym_logo=CASE WHEN role='admin' AND ${b.gymLogo!==undefined} THEN ${gymLogo?'data:image/jpeg;base64,'+gymLogo:null} ELSE gym_logo END,created_by=CASE WHEN role='supervisor' THEN ${gymAdminId} ELSE created_by END,gym_name=CASE WHEN role='admin' THEN ${target.role==='admin'?b.gymName.trim():null} WHEN role='superadmin' THEN NULL ELSE gym_name END,password=COALESCE(${password},password) WHERE id=${b.id} AND (${!ownSupervisor} OR role='supervisor' AND created_by=${u.id}) RETURNING id,public_id,name,role,phone,pending_phone,password_ready,gym_name,gym_address,gym_phone,gym_website,created_by,gym_logo,location_id`,
   sql`DELETE FROM sessions WHERE user_id=${b.id} AND EXISTS(SELECT 1 FROM users target_user WHERE target_user.id=${b.id} AND (${!ownSupervisor} OR target_user.role='supervisor' AND target_user.created_by=${u.id})) AND (${password}::text IS NOT NULL OR ${target.role==='supervisor'&&(gymAdminId!==target.created_by||assignedLocation.id!==target.location_id)}) AND token_hash<>${tokenHash(token)}`
  ]);
  return updated.length?response(publicUser({...updated[0],location_name:assignedLocation?.name})):fail('User not found',404);
 }
 if(req.method==='DELETE'){
  const b=await req.json();if(!Number.isInteger(b.id)||b.id<=0)return fail('Invalid record',400);
  let deleted=[];
  if(action==='plans'&&u.role==='admin')deleted=await sql`UPDATE plans SET archived=TRUE WHERE id=${b.id} AND admin_id=${u.id} AND archived=FALSE RETURNING id`;
  else if(action==='members'&&['superadmin','admin'].includes(u.role))deleted=u.role==='superadmin'?await sql`UPDATE members SET archived_at=NOW() WHERE archived_at IS NULL AND id=${b.id} RETURNING id`:await sql`UPDATE members SET archived_at=NOW() WHERE archived_at IS NULL AND id=${b.id} AND admin_id=${u.id} RETURNING id`;
  else if(action==='supervisors'&&['superadmin','admin'].includes(u.role))deleted=u.role==='superadmin'?await sql`UPDATE users SET archived_at=NOW() WHERE archived_at IS NULL AND id=${b.id} AND role='supervisor' RETURNING id`:await sql`UPDATE users SET archived_at=NOW() WHERE archived_at IS NULL AND id=${b.id} AND role='supervisor' AND created_by=${u.id} RETURNING id`;
  else if(action==='admins'&&u.role==='superadmin')deleted=await sql`UPDATE users SET archived_at=NOW() WHERE archived_at IS NULL AND id=${b.id} AND role='admin' RETURNING id`;
  else return fail('Access denied',403);
  return deleted.length?response({ok:true}):fail('Record not found',404);
 }
 if(action==='superadmins') {
  if(!isMainSuperadmin(publicUser(u)))return fail('Superadmin access required',403);
  if(req.method!=='GET')return fail('Additional superadmin accounts are disabled',405);
  return response([publicUser(u)]);
 }
 if(action==='admins') {
  if(req.method==='POST'&&!canCreateGymAdmin(publicUser(u)))return fail('This account cannot create gym admins',403);
  if(u.role!=='superadmin')return fail('Superadmin access required',403);
  if(req.method==='GET')return response((await sql`SELECT id,public_id,name,role,phone,pending_phone,password_ready,gym_name,gym_address,gym_phone,gym_website,created_by,gym_logo FROM users WHERE role='admin' AND archived_at IS NULL ORDER BY id DESC`).map(publicUser));
  if(req.method==='POST'){const b=await req.json();if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100)return fail('Enter a name',400);if(typeof b.gymName!=='string'||!b.gymName.trim()||b.gymName.trim().length>100)return fail('Enter a gym name',400);const phone=normalizeWhatsAppPhone(b.gymPhone,b.gymCountry);if(!phone)return fail('Invalid phone number',400);const password=await hashPassword(randomBytes(32).toString('hex'));const gymLogo=await normalizeMemberPicture(b.gymLogo);if(!gymLogo)return fail('Upload a gym logo',400);const branding=normalizeGymBranding(b);const [admin]=await sql`INSERT INTO users(name,password,role,phone,created_by,gym_name,gym_logo,gym_address,gym_phone,gym_website) VALUES(${b.name.trim()},${password},'admin',${phone},${u.id},${b.gymName.trim()},${'data:image/jpeg;base64,'+gymLogo},${branding.address},${branding.phone},${branding.website}) RETURNING id,public_id,name,role,phone,pending_phone,password_ready,gym_name,gym_address,gym_phone,gym_website,created_by,gym_logo`;return response(publicUser(admin),201);}
 }
 if(action==='supervisors') {
  if(!['superadmin','admin'].includes(u.role))return fail('Admin or superadmin access required',403);
  if(req.method==='GET'){const rows=u.role==='superadmin'?await sql`SELECT s.id,s.public_id,s.name,s.role,s.phone,s.pending_phone,s.password_ready,s.created_by,s.location_id,(SELECT name FROM gym_locations WHERE id=s.location_id) AS location_name,COALESCE(NULLIF(a.gym_name,''),a.name) AS gym_name FROM users s LEFT JOIN users a ON s.created_by=a.id AND a.role='admin' WHERE s.archived_at IS NULL AND gym_account_enabled(s.id) AND s.role='supervisor' ORDER BY s.id DESC`:await sql`SELECT s.id,s.public_id,s.name,s.role,s.phone,s.created_by,s.location_id,(SELECT name FROM gym_locations WHERE id=s.location_id) AS location_name,COALESCE(NULLIF(a.gym_name,''),a.name) AS gym_name FROM users s LEFT JOIN users a ON s.created_by=a.id AND a.role='admin' WHERE s.archived_at IS NULL AND gym_account_enabled(s.id) AND s.role='supervisor' AND s.created_by=${u.id} ORDER BY s.id DESC`;return response(rows.map(publicUser));}
  if(req.method==='POST')return fail('Only the assigned location manager can create supervisors',403);
 }
 if(action==='plans'){
  if(req.method==='GET'&&u.role==='superadmin')return response(await sql`SELECT p.id,p.name,p.duration_days,p.amount,p.description,COALESCE(NULLIF(u.gym_name,''),u.name) AS admin_name FROM plans p JOIN users u ON p.admin_id=u.id WHERE p.archived=FALSE ORDER BY p.id DESC`);
  if(u.role!=='admin'&&!(u.role==='superadmin'&&req.method==='PATCH'))return fail('Admin access required',403);
  if(req.method==='GET')return response(await sql`SELECT id,name,duration_days,amount,description FROM plans WHERE admin_id=${u.id} AND archived=FALSE ORDER BY id DESC`);
  if(['POST','PATCH'].includes(req.method)){
   const b=await req.json(),plan=validatePlan(b);if(plan.error)return fail(plan.error,400);
   if(req.method==='PATCH'){
    if(!Number.isInteger(b.id)||b.id<=0)return fail('Invalid plan',400);
    const [updated]=await sql`UPDATE plans SET name=${plan.name},duration_days=${plan.durationDays},amount=${plan.amount},description=${plan.description} WHERE id=${b.id} AND (${u.role}='superadmin' OR admin_id=${u.id}) AND archived=FALSE RETURNING id,name,duration_days,amount,description`;
    return updated?response(updated):fail('Plan not found',404);
   }
   const adminId=u.role==='admin'?u.id:Number(b.adminId);
   if(!Number.isInteger(adminId)||adminId<1)return fail('Select a gym',400);
   const [gym]=await sql`SELECT id FROM users WHERE id=${adminId} AND role='admin'`;if(!gym)return fail('Select a valid gym',400);
   const [created]=await sql`INSERT INTO plans(admin_id,name,duration_days,amount,description) VALUES(${adminId},${plan.name},${plan.durationDays},${plan.amount},${plan.description}) ON CONFLICT DO NOTHING RETURNING id,name,duration_days,amount,description`;
   return created?response(created,201):fail('Plan already exists',409);
  }
 }
 if(action==='member-registration'&&req.method==='POST'){
  if(u.role!=='admin')return fail('Admin access required',403);
  const registrationToken=randomBytes(32).toString('hex');
  const [reserved]=await sql`INSERT INTO member_registrations(token_hash,admin_id,member_id,public_id) VALUES(${tokenHash(registrationToken)},${u.id},nextval(pg_get_serial_sequence('members','id')),gym_next_public_id('mem','gym_member_ids')) RETURNING member_id,public_id`;
  return response({registrationToken,registrationNo:reserved.public_id},201);
 }
 if(action==='member-photo'&&req.method==='GET'){
  const id=Number(new URL(req.url).searchParams.get('id'));if(!Number.isInteger(id)||id<1)return fail('Not found',404);
  const [picture]=u.role==='superadmin'?await sql`SELECT p.data FROM member_pictures p JOIN members m ON m.id=p.member_id WHERE m.id=${id}`:await sql`SELECT p.data FROM member_pictures p JOIN members m ON m.id=p.member_id WHERE m.id=${id} AND m.admin_id=${['manager','supervisor'].includes(u.role)?u.created_by:u.id} AND (${!['manager','supervisor'].includes(u.role)} OR m.location_id=${u.location_id||null})`;
  if(!picture)return fail('Not found',404);
  return new Response(Buffer.from(picture.data,'base64'),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(action==='members') {
  if(u.role==='supervisor')return fail('Supervisor access is limited to the QR scanner and attendance sheet',403);
  if(req.method==='PATCH'){
   if(!['admin','superadmin'].includes(u.role))return fail('Admin access required',403);
   const b=await req.json();if(!Number.isInteger(b.id)||b.id<1)return fail('Invalid member',400);
   const [existing]=await sql`SELECT *,to_char(valid_from,'YYYY-MM-DD') AS valid_from,to_char(valid_to,'YYYY-MM-DD') AS valid_to,to_char(dob,'YYYY-MM-DD') AS dob FROM members WHERE id=${b.id} AND (${u.role}='superadmin' OR admin_id=${u.id})`;
   if(!existing)return fail('Member not found',404);
   const validFrom=String(existing.valid_from).slice(0,10),validTo=String(existing.valid_to).slice(0,10);
   if(b.planId!==undefined&&Number(b.planId)!==existing.plan_id||b.validFrom!==undefined&&b.validFrom!==validFrom||b.validTo!==undefined&&b.validTo!==validTo)return fail('Membership plan and dates cannot be changed while editing member details',409);
   const m=validateMember({...b,dob:b.dob===undefined?existing.dob:b.dob,planId:existing.plan_id,validFrom,validTo});if(m.error)return fail(m.error,400);
   const location=await resolveGymLocation(sql,existing.admin_id,b.locationName!==undefined||b.locationId!==undefined?b:{locationId:existing.location_id});
   const picture=b.profilePicture===undefined?null:await normalizeMemberPicture(b.profilePicture);
   const [updated]=await sql.transaction([
    sql`UPDATE members SET location_id=${location.id},name=${m.name},phone=${m.phone},gender=${m.gender},age=${m.age},dob=${m.dob},address=${m.address},height_ft=${m.height},weight_kg=${m.weight},interested_area=${m.interestedArea},status=${m.status} WHERE id=${b.id} AND (${u.role}='superadmin' OR admin_id=${u.id}) RETURNING id,public_id`,
    sql`INSERT INTO member_pictures(member_id,data) SELECT id,${picture}::text FROM members WHERE id=${b.id} AND (${u.role}='superadmin' OR admin_id=${u.id}) AND ${b.profilePicture!==undefined} AND ${picture}::text IS NOT NULL ON CONFLICT(member_id) DO UPDATE SET data=EXCLUDED.data`,
    sql`DELETE FROM member_pictures WHERE member_id=${b.id} AND ${b.profilePicture!==undefined&&picture===null} AND EXISTS(SELECT 1 FROM members WHERE id=${b.id} AND (${u.role}='superadmin' OR admin_id=${u.id}))`
   ]);
   return updated.length?response({memberId:updated[0].public_id}):fail('Member not found',404);
  }
  if(req.method==='GET'){const rows=u.role==='superadmin'?await sql`SELECT m.*,(SELECT name FROM gym_locations WHERE id=m.location_id) AS "locationName",(SELECT COALESCE(NULLIF(gym_owner.gym_name,''),gym_owner.name) FROM users gym_owner WHERE gym_owner.id=m.admin_id) AS "gymName",to_char(m.joined,'YYYY-MM-DD') AS joined,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,to_char(m.dob,'YYYY-MM-DD') AS dob,EXISTS(SELECT 1 FROM member_pictures p WHERE p.member_id=m.id) AS has_picture FROM members m WHERE m.archived_at IS NULL ORDER BY m.id DESC`:await sql`SELECT m.*,(SELECT name FROM gym_locations WHERE id=m.location_id) AS "locationName",(SELECT COALESCE(NULLIF(gym_owner.gym_name,''),gym_owner.name) FROM users gym_owner WHERE gym_owner.id=m.admin_id) AS "gymName",to_char(m.joined,'YYYY-MM-DD') AS joined,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,to_char(m.dob,'YYYY-MM-DD') AS dob,EXISTS(SELECT 1 FROM member_pictures p WHERE p.member_id=m.id) AS has_picture FROM members m WHERE m.archived_at IS NULL AND m.admin_id=${['manager','supervisor'].includes(u.role)?u.created_by:u.id} ORDER BY m.id DESC`;return response(rows.map(({password,password_ready,...m})=>({...m,age:m.dob?ageFromDateOfBirth(m.dob):m.age,registrationNo:m.public_id,memberId:m.public_id,profilePictureUrl:m.has_picture?'/api/member-photo?id='+m.id:null})));}
  if(req.method==='POST'){
   if(u.role!=='admin')return fail('Sign in as an admin to add members',403);
   const b=await req.json(),m=validateMember(b);if(m.error)return fail(m.error,400);
   if(!PAYMENT_MODES.includes(b.paymentMode))return fail('Select Cash or Online payment',400);
   if(typeof b.registrationToken!=='string'||!/^[a-f0-9]{64}$/.test(b.registrationToken))return fail('Reopen Add Member to generate a registration number',400);
   const location=await resolveGymLocation(sql,u.id,b);
   const picture=await normalizeMemberPicture(b.profilePicture);
   const [created]=await sql`WITH reserved AS (DELETE FROM member_registrations WHERE token_hash=${tokenHash(b.registrationToken)} AND admin_id=${u.id} AND expires_at>NOW() AND EXISTS(SELECT 1 FROM plans WHERE id=${m.planId} AND admin_id=${u.id} AND archived=FALSE AND amount IS NOT NULL) RETURNING member_id,public_id), added AS (INSERT INTO members(id,public_id,admin_id,location_id,name,phone,email,plan,plan_id,gender,age,dob,address,height_ft,weight_kg,interested_area,status,valid_from,valid_to) SELECT reserved.member_id,reserved.public_id,${u.id},${location.id},${m.name},${m.phone},'',p.name,p.id,${m.gender},${m.age},${m.dob},${m.address},${m.height},${m.weight},${m.interestedArea},${m.status},${m.validFrom},${m.validTo} FROM plans p CROSS JOIN reserved WHERE p.id=${m.planId} AND p.admin_id=${u.id} AND p.archived=FALSE RETURNING id,public_id), saved_picture AS (INSERT INTO member_pictures(member_id,data) SELECT id,${picture}::text FROM added WHERE ${picture}::text IS NOT NULL), initial_membership AS (INSERT INTO membership_assignments(admin_id,member_id,plan_id,plan_name,amount,paid,valid_from,valid_to,request_key) SELECT ${u.id},a.id,p.id,p.name,p.amount,p.amount,${m.validFrom},${m.validTo},'registration-'||a.id FROM added a CROSS JOIN plans p WHERE p.id=${m.planId} AND p.amount IS NOT NULL RETURNING id,amount), initial_payment AS (INSERT INTO membership_payments(assignment_id,admin_id,amount,method,reference,paid_on,request_key) SELECT id,${u.id},amount,${b.paymentMode},'',(NOW() AT TIME ZONE 'Asia/Kolkata')::date,'registration-'||id FROM initial_membership WHERE amount>0) SELECT id,public_id FROM added`;
   if(!created)return fail('Membership or registration is invalid. Reopen Add Member.',400);
   return response({memberId:created.public_id,registrationNo:created.public_id},201);
  }
 }
 return fail('Method not allowed',405);
}catch(error){if(error.message==='PHONE_IN_USE'||['users_unique_phone','members_unique_phone','account_phone_registry_pkey'].includes(error.constraint))return fail('This phone number is already registered to another user',409);if(error.message==='INVALID_ACCOUNT_PHONE')return fail('Enter a valid phone number',400);if(error.code==='GYM_BRANDING_INVALID')return fail(error.message,400);if(error.message==='GYM_LOCATION_REQUIRED')return fail('Select or type a location',400);if(error.message==='INVALID_GYM_LOCATION')return fail('Select a location belonging to this gym',400);if(error.message==='INVALID_PICTURE')return fail('Choose a valid JPG, PNG or WebP picture up to 2 MB',400);if(error.code==='23505')return fail('Plan already exists',409);if(error.code==='23503')return fail('This record has linked members, memberships or payments.',409);if(error.message==='DATABASE_NOT_CONFIGURED')return fail('Service is not configured. Contact your administrator.',503);if(error instanceof SyntaxError)return fail('Invalid request',400);console.error('Database request failed:',error.code||'connection error');return fail('Unable to load data. Please retry.',503);}
}
export {handle as GET,handle as POST,handle as DELETE,handle as PATCH};
