import {employeeRolesApi} from '../../../lib/employee-roles-api';
import {employeesApi} from '../../../lib/employees-api';
import {employeeDetails} from '../../../lib/employee-details';
import {memberQueriesApi} from '../../../lib/member-queries-api';
import {normalizeSubscription,subscriptionError} from '../../../lib/gym-subscription.mjs';
import {registrationCharge,createRegisteredMember} from '../../../lib/member-registration-payment.mjs';
import {membershipAddonsApi} from '../../../lib/membership-addons-api';
import {sameRequestOrigin} from '../../../lib/request-origin.mjs';
import {logoutApi} from '../../../lib/logout-api.js';
import {normalizeEmail} from '../../../lib/email-otp.mjs';
import {leadFollowupsApi} from '../../../lib/lead-followups-api';
import {advanceRenewal} from '../../../lib/advance-renewal-api';
import {memberGroupsApi} from '../../../lib/member-groups-api';
import {leadsApi} from '../../../lib/leads-api';
const staffPassImage=async(...args)=>(await import('../../../lib/staff-pass-api')).staffPassImage(...args);
import {commerceApi} from '../../../lib/commerce-api';
import {sendPaymentPass} from '../../../lib/payment-whatsapp.mjs';
import {canUpgradePlan,fixedDateOfBirth,updateMemberWithUpgrade} from '../../../lib/member-upgrade.mjs';
import {loginApi} from '../../../lib/login-api.js';
import {adminRecentActivity} from '../../../lib/admin-recent-activity';
const gymLogoApi=async(...args)=>(await import('../../../lib/gym-logo-api')).gymLogoApi(...args);
import {gymTimeReport,gymTimeCalendar} from '../../../lib/gym-time-report';
import {resolvePhoneAccount,resolveEmailOtpAccount} from '../../../lib/phone-account.mjs';
const videoApi=async(...args)=>(await import('../../../lib/video-api')).videoApi(...args);
const memberSession=async(...args)=>(await import('../../../lib/member-auth')).memberSession(...args);
import {memberPhoneAuthApi} from '../../../lib/member-phone-auth-api';
import {phoneAuthApi} from '../../../lib/phone-auth-api';
import {normalizeGymBranding} from '../../../lib/gym-branding.mjs';
import {sessionProfile} from '../../../lib/session-profile.mjs';
import {managerApi} from '../../../lib/manager-api';
import {managerSupervisors} from '../../../lib/manager-supervisors';
import {auditCredentialDelivery} from '../../../lib/audit-delivery.mjs';
import {withAuditActor} from '../../../lib/audit-database.mjs';
import {auditApi} from '../../../lib/audit-api';
import {sendWapMonkeyInvitation} from '../../../lib/wapmonkey.mjs';
import {whatsappConfiguration} from '../../../lib/whatsapp-cloud.mjs';
import {resolveGymLocation} from '../../../lib/gym-locations.mjs';
const gatePassApi=async(...args)=>(await import('../../../lib/gate-pass-api')).gatePassApi(...args);
import { PAYMENT_MODES, registrationPayment } from '../../../lib/payments.mjs';
import { isMainSuperadmin, canCreateGymAdmin } from '../../../lib/user-permissions.mjs';
import { publicUser } from '../../../lib/user-profile.mjs';
import { attendanceApi } from '../../../lib/attendance-api';
import { membershipApi } from '../../../lib/membership-api';
import { validateMember, ageFromDateOfBirth, memberToday } from '../../../lib/members.mjs';
const normalizeMemberPicture=async(...args)=>(await import('../../../lib/member-picture.mjs')).normalizeMemberPicture(...args);
import { validatePlan } from '../../../lib/plans.mjs';
import { normalizeWhatsAppPhone } from '../../../lib/whatsapp.mjs';
import { NextResponse, after } from 'next/server';
import { randomBytes } from 'node:crypto';
import { database } from '../../../lib/db';
import { hashPassword, tokenHash } from '../../../lib/password.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status)=>response({error},status);
async function handle(req,context) {
try {
 const {action}=await context.params;
 if(!['employee-roles','employees','employee-details','member-queries','product-inventory','support','gym-subscription','membership-addons','lead-followups','membership-renew','member-groups','leads','staff-pass','supplement-image','supplements','supplement-cart','supplement-orders','payment-info','admin-recent-activity','gym-logo','member-time-calendar','gym-time-report','videos','video-stream','member-login','member-pass','member-otp-request','member-otp-verify','member-otp-set-password','otp-request','otp-verify','otp-set-password','manager-registration','managers','manager-dashboard','audit','gym-locations','supervisor-summary','gate-pass','gate-pass-scan','whatsapp-gate-pass','login','logout','me','superadmins','admins','members','supervisors','credentials','plans','member-photo','member-registration','memberships','membership-payments','users','attendance'].includes(action))return fail('Not found',404);
 if(['POST','PATCH','DELETE'].includes(req.method)&&!sameRequestOrigin(req))return fail('Invalid origin',403);
 if(action==='logout')return await logoutApi(req,database);
 if(['POST','PATCH'].includes(req.method)&&!['member-registration','manager-registration'].includes(action)){const body=await req.clone().json();if(body.email!==undefined){try{normalizeEmail(body.email);}catch{return fail('Enter a valid email address',400);}}}
 let sql=database();
 if(action.startsWith('member-otp-'))return await memberPhoneAuthApi(action.slice(7),req,sql);
 if(action==='member-login'&&req.method==='POST')return await loginApi(req,sql,{memberOnly:true});
 if(action==='otp-request'){
  const body=await req.clone().json();
  if(body.channel==='email'&&body.email&&!body.phone){
   const account=await resolveEmailOtpAccount(body,sql);
   if(!account)return response({challengeId:randomBytes(32).toString('hex'),expiresIn:600,resendAfter:60},202);
   const emailRequest=new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify({...body,phone:account.phone})});
   return await (account.source_table==='members'?memberPhoneAuthApi:phoneAuthApi)(action,emailRequest,sql);
  }
 }
 if(['otp-request','otp-verify','otp-set-password'].includes(action)){const account=await resolvePhoneAccount(action,await req.clone().json(),sql);return await (account==='member'?memberPhoneAuthApi:phoneAuthApi)(action,req,sql);}
 if(action==='login'&&req.method==='POST')return await loginApi(req,sql);
 const token=req.cookies.get('session')?.value;if(!token)return fail('Please sign in',401);
 if(token.startsWith('m.')){const memberResponse=await memberSession(action,req,sql,token);return memberResponse||fail('Please sign in',401);}
 const [u]=await sql`SELECT u.*,(SELECT name FROM employee_roles er WHERE er.id=u.employee_role_id AND er.admin_id=u.created_by) AS employee_role_name,g.contact_phone AS owner_gym_phone,g.gym_website AS owner_gym_website,g.email AS gym_email,CASE WHEN u.role IN ('manager','supervisor') THEN g.gym_logo ELSE u.gym_logo END AS gym_logo,gym_account_enabled(u.id) AS account_enabled,gym_subscription_active(CASE WHEN u.role='admin' THEN u.id ELSE u.created_by END) AS subscription_active,l.name AS location_name,CASE WHEN u.role IN ('manager','supervisor') THEN COALESCE(NULLIF(g.gym_name,''),g.name) ELSE u.gym_name END AS gym_name FROM users u JOIN sessions s ON u.id=s.user_id LEFT JOIN (SELECT *,COALESCE(NULLIF(gym_phone,''),phone) AS contact_phone FROM users WHERE role='admin') g ON g.id=u.created_by LEFT JOIN gym_locations l ON l.id=u.location_id WHERE s.token_hash=${tokenHash(token)} AND s.expires_at>NOW()`;
 if(!u||!u.account_enabled||u.role==='superadmin'&&!isMainSuperadmin(publicUser(u)))return fail('Please sign in',401);
 if(u.role!=='superadmin'&&!u.password_ready)return fail('Verify your WhatsApp number and set your password.',401);
 if(u.role!=='superadmin'&&u.subscription_active===false)return fail('Organization subscription is not active. Contact superadmin.',403);
 sql=withAuditActor(sql,u);
 const gymId=u.role==='manager'?u.created_by:u.id,branch=u.role==='manager'?u.location_id:null;
 if(u.role==='manager'&&!branch)return fail('Assigned location required',403);
 if(u.role==='manager'&&!['employee-roles','employees','employee-details','product-inventory','membership-addons','lead-followups','membership-renew','member-groups','leads','gate-pass-scan','staff-pass','supplement-cart','supplement-image','supplements','supplement-orders','payment-info','me','logout','manager-dashboard','member-time-calendar','gym-time-report','supervisors','attendance','credentials','member-photo','members','member-registration','plans','gym-locations','gym-logo','memberships','membership-payments','videos','video-stream','audit','admin-recent-activity','gate-pass','whatsapp-gate-pass','managers','manager-registration'].includes(action))return fail('Manager access is limited to your assigned location',403);
 if(action==='employee-roles')return await employeeRolesApi(req,u,sql);
 if(action==='employees')return await employeesApi(req,u,sql);
 if(action==='employee-details')return await employeeDetails(req,u,sql);
 if(action==='member-queries')return memberQueriesApi(req,u,sql);
 if(action==='membership-addons')return membershipAddonsApi(req,u,sql);
 if(action==='membership-renew'){const result=await advanceRenewal(req,u,sql);if(result.status===201){const payment=await result.clone().json();after(async()=>{try{await sendPaymentPass(sql,u,{paymentId:payment.id});}catch{console.error('Automatic renewal WhatsApp delivery failed');}});}return result;}
 if(action==='member-groups')return memberGroupsApi(req,u,sql);
 if(action==='lead-followups')return leadFollowupsApi(req,u,sql);
 if(action==='leads')return leadsApi(req,u,sql);
 if(action==='staff-pass')return req.method==='GET'?staffPassImage(u,sql):fail('Method not allowed',405);
 if(['product-inventory','supplement-image','supplements','supplement-cart','supplement-orders','payment-info'].includes(action))return commerceApi(action,req,u,sql);
 if(['manager-registration','managers','manager-dashboard'].includes(action))return await managerApi(action,req,u,sql);
 if(['videos','video-stream'].includes(action))return await videoApi(action,req,u,sql);
 if(action==='supervisors'&&(u.role==='manager'||u.role==='admin'&&req.method==='POST'))return await managerSupervisors(req,u,sql);
 if(action==='admin-recent-activity')return await adminRecentActivity(req,u,sql);
 if(action==='gym-logo')return await gymLogoApi(req,u,sql);
 if(action==='audit')return await auditApi(req,u,sql);
 if(['gate-pass','gate-pass-scan','whatsapp-gate-pass'].includes(action))return await gatePassApi(action,req,u,sql);
 if(action==='gym-locations'){
  if(req.method!=='GET')return fail('Method not allowed',405);
  if(!['superadmin','admin','manager'].includes(u.role))return fail('Admin access required',403);
  const adminId=Number(new URL(req.url).searchParams.get('adminId')||(['admin','manager'].includes(u.role)?gymId:0));
  if(!Number.isInteger(adminId)||adminId<1||adminId>2147483647)return fail('Select a organization',400);
  if(['admin','manager'].includes(u.role)&&adminId!==gymId)return fail('Access denied',403);
  const [gym]=await sql`SELECT id FROM users WHERE archived_at IS NULL AND id=${adminId} AND role='admin'`;if(!gym)return fail('Organization not found',404);
  return response(await sql`SELECT id,name FROM gym_locations WHERE admin_id=${adminId} AND (${!branch} OR id=${branch}) AND lower(trim(name))<>'main location' ORDER BY lower(name)`);
 }
 if(action==='supervisor-summary'){
  if(!u.location_id)return fail('Ask your organization admin to assign your location',403);
  if(req.method!=='GET')return fail('Method not allowed',405);
  if(u.role!=='supervisor')return fail('Supervisor access required',403);
  const today=memberToday();
  const [summary]=await sql`SELECT count(*)::int AS "totalMembers",count(*) FILTER(WHERE joined>=date_trunc('month',${today}::date)::date AND joined<=${today}::date)::int AS "joinedThisMonth" FROM members WHERE archived_at IS NULL AND admin_id=${u.created_by} AND location_id=${u.location_id}`;
  return response(summary);
 }
 if(action==='member-time-calendar')return await gymTimeCalendar(req,u,sql);
 if(action==='gym-time-report')return await gymTimeReport(req,u,sql);
 if(action==='attendance')return await attendanceApi(req,u,sql);
 if(['memberships','membership-payments'].includes(action)){const result=await membershipApi(action,req,u,sql);if(action==='membership-payments'&&req.method==='POST'&&result.status===201){const payment=await result.clone().json();after(async()=>{try{await sendPaymentPass(sql,u,{paymentId:payment.id});}catch{console.error('Automatic payment WhatsApp delivery failed');}});}return result;}
 if(action==='support'&&req.method==='GET'){
  if(u.role!=='admin')return fail('Admin access required',403);
  const [contact]=await sql`SELECT name,phone,email FROM users WHERE role='superadmin' AND public_id='sp00' AND archived_at IS NULL`;
  return response(contact||{});
 }
 if(action==='gym-subscription'&&req.method==='GET'){
  if(!['superadmin','admin'].includes(u.role))return fail('Admin access required',403);
  if(u.role==='admin'&&new URL(req.url).searchParams.get('overview')==='1')return fail('Superadmin access required',403);
  if(new URL(req.url).searchParams.get('overview')==='1')return response(await sql`SELECT g.id,g.public_id AS "userId",g.name,g.gym_name AS "gymName",g.gym_logo AS "gymLogo",g.gym_address AS "gymAddress",s.member_limit,s.manager_limit,s.supervisor_limit,s.branch_limit,to_char(s.valid_from,'YYYY-MM-DD') AS valid_from,to_char(s.valid_until,'YYYY-MM-DD') AS valid_until,gym_subscription_active(g.id) AS active,gym_active_member_count(g.id,(NOW() AT TIME ZONE 'Asia/Kolkata')::date) AS members_used,(SELECT count(*)::int FROM members WHERE admin_id=g.id AND archived_at IS NULL) AS members_total,(SELECT count(*)::int FROM users WHERE created_by=g.id AND role='manager' AND archived_at IS NULL) AS managers_used,(SELECT count(*)::int FROM users WHERE created_by=g.id AND role='supervisor' AND archived_at IS NULL) AS supervisors_used,(SELECT count(*)::int FROM gym_locations WHERE admin_id=g.id) AS branches_used FROM users g LEFT JOIN gym_subscriptions s ON s.admin_id=g.id WHERE g.role='admin' AND g.archived_at IS NULL ORDER BY g.id DESC`);
  const id=u.role==='admin'?u.id:Number(new URL(req.url).searchParams.get('adminId'));if(!Number.isSafeInteger(id)||id<1)return fail('Invalid organization',400);
  const [plan]=await sql`SELECT s.*, gym_active_member_count(g.id,(NOW() AT TIME ZONE 'Asia/Kolkata')::date) AS members_used,(SELECT count(*)::int FROM members WHERE admin_id=g.id AND archived_at IS NULL) AS members_total,(SELECT count(*)::int FROM users WHERE created_by=g.id AND role='manager' AND archived_at IS NULL) AS managers_used,(SELECT count(*)::int FROM users WHERE created_by=g.id AND role='supervisor' AND archived_at IS NULL) AS supervisors_used,(SELECT count(*)::int FROM gym_locations WHERE admin_id=g.id) AS branches_used,to_char(s.valid_from,'YYYY-MM-DD') AS valid_from,to_char(s.valid_until,'YYYY-MM-DD') AS valid_until FROM users g LEFT JOIN gym_subscriptions s ON s.admin_id=g.id WHERE g.id=${id} AND g.role='admin'`;
  return plan?response(plan):fail('Organization not found',404);
 }
 if(action==='me'&&req.method==='GET')return response(sessionProfile(u));
 if(action==='credentials'&&req.method==='POST'){
  const b=await req.json();if(!Number.isInteger(b.id))return fail('Invalid account',400);
  const [target]=u.role==='superadmin'?await sql`SELECT * FROM users WHERE id=${b.id} AND role IN ('admin','manager','supervisor')`:u.role==='admin'?await sql`SELECT * FROM users WHERE id=${b.id} AND role='manager' AND created_by=${u.id}`:u.role==='manager'?await sql`SELECT * FROM users WHERE id=${b.id} AND role IN ('supervisor','manager') AND created_by=${u.created_by} AND location_id=${u.location_id}`:[];
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
  if(ownSupervisor&&b.gymAdminId!==undefined&&Number(b.gymAdminId)!==u.id)return fail('Supervisors must remain in your organization',403);
  if(target.role==='superadmin'&&!isMainSuperadmin(publicUser(u))&&target.id!==u.id)return fail('Only sp00 can manage other superadmins',403);
  if(req.method==='DELETE'){
   if(target.role==='superadmin')return fail('The superadmin account cannot be deleted',403);
   if(target.role==='manager')return fail('Only the organization admin can delete this manager',403);
   await sql`UPDATE users SET archived_at=NOW() WHERE id=${b.id} AND role IN ('admin','supervisor') AND archived_at IS NULL`;return response({ok:true});
  }
  if(typeof b.name!=='string'||!b.name.trim()||b.name.trim().length>100)return fail('Enter a name',400);
  const phone=b.phone===''&&target.role==='superadmin'?'':normalizeWhatsAppPhone(target.role==='admin'?b.gymPhone:b.phone,target.role==='admin'?b.gymCountry:b.country);if(phone===null)return fail('Invalid phone number',400);
  if(target.role==='admin'&&(typeof b.gymName!=='string'||!b.gymName.trim()||b.gymName.trim().length>100))return fail('Enter a organization name',400);
  const branding=target.role==='admin'?normalizeGymBranding(b):null;
  let gymAdminId=target.created_by,assignedLocation=null;
  if(target.role==='supervisor'){
   gymAdminId=Number(b.gymAdminId??target.created_by);
   if(!Number.isInteger(gymAdminId)||gymAdminId<1)return fail('Select a organization',400);
   const [gym]=await sql`SELECT id FROM users WHERE archived_at IS NULL AND id=${gymAdminId} AND role='admin'`;
   if(!gym)return fail('Select a valid organization',400);
   assignedLocation=await resolveGymLocation(sql,gymAdminId,b.locationName!==undefined||b.locationId!==undefined?b:{locationId:gymAdminId===target.created_by?target.location_id:null});
  }
  if(b.password!==undefined&&typeof b.password!=='string')return fail('Invalid password',400);
  if(target.role!=='superadmin'&&b.password)return fail('Users set their own password through WhatsApp verification',400);
  const password=target.role==='superadmin'&&b.password?await hashPassword(b.password):null;
  const gymLogo=target.role==='admin'&&b.gymLogo!==undefined?await normalizeMemberPicture(b.gymLogo):null;
  if(target.role==='admin'&&!gymLogo)return fail('Upload a organization logo',400);
  const limits=target.role==='admin'&&b.subscriptionConfigured==='1'?normalizeSubscription(b):null;
 const [updated]=await sql.transaction([
   sql`UPDATE users SET email=COALESCE(${b.email===undefined?null:normalizeEmail(b.email)},email),name=${b.name.trim()},phone=${phone},gym_address=CASE WHEN role='admin' THEN ${branding?.address||''} ELSE gym_address END,gym_phone=CASE WHEN role='admin' THEN ${branding?.phone||''} ELSE gym_phone END,gym_gst_number=CASE WHEN role='admin' THEN ${branding?.gstNumber||''} ELSE gym_gst_number END,gym_gst_rate=CASE WHEN role='admin' THEN ${branding?.gstRate||0} ELSE gym_gst_rate END,gym_website=CASE WHEN role='admin' THEN ${branding?.website||''} ELSE gym_website END,location_id=CASE WHEN role='supervisor' THEN ${assignedLocation?.id||null} ELSE location_id END,gym_logo=CASE WHEN role='admin' AND ${b.gymLogo!==undefined} THEN ${gymLogo?'data:image/jpeg;base64,'+gymLogo:null} ELSE gym_logo END,created_by=CASE WHEN role='supervisor' THEN ${gymAdminId} ELSE created_by END,gym_name=CASE WHEN role='admin' THEN ${target.role==='admin'?b.gymName.trim():null} WHEN role='superadmin' THEN NULL ELSE gym_name END,password=COALESCE(${password},password) WHERE id=${b.id} AND (${!ownSupervisor} OR role='supervisor' AND created_by=${u.id}) RETURNING id,public_id,name,role,email,phone,pending_phone,password_ready,gym_name,gym_address,gym_phone,gym_website,gym_gst_number,gym_gst_rate,created_by,gym_logo,location_id`,
   ...(limits?[sql`INSERT INTO gym_subscriptions(admin_id,valid_from,valid_until,member_limit,manager_limit,supervisor_limit,branch_limit) VALUES(${b.id},${limits.validFrom}::date,${limits.validUntil}::date,${limits.memberLimit},${limits.managerLimit},${limits.supervisorLimit},${limits.branchLimit}) ON CONFLICT(admin_id) DO UPDATE SET valid_from=EXCLUDED.valid_from,valid_until=EXCLUDED.valid_until,member_limit=EXCLUDED.member_limit,manager_limit=EXCLUDED.manager_limit,supervisor_limit=EXCLUDED.supervisor_limit,branch_limit=EXCLUDED.branch_limit`]:[]),
 sql`DELETE FROM sessions WHERE user_id=${b.id} AND EXISTS(SELECT 1 FROM users target_user WHERE target_user.id=${b.id} AND (${!ownSupervisor} OR target_user.role='supervisor' AND target_user.created_by=${u.id})) AND (${password}::text IS NOT NULL OR ${target.role==='supervisor'&&(gymAdminId!==target.created_by||assignedLocation.id!==target.location_id)}) AND token_hash<>${tokenHash(token)}`
  ]);
  return updated.length?response(publicUser({...updated[0],location_name:assignedLocation?.name})):fail('User not found',404);
 }
 if(req.method==='DELETE'){
  const b=await req.json();if(!Number.isInteger(b.id)||b.id<=0)return fail('Invalid record',400);
  let deleted=[];
  if(action==='plans'&&u.role==='admin')deleted=await sql`UPDATE plans SET archived=TRUE WHERE id=${b.id} AND admin_id=${gymId} AND archived=FALSE RETURNING id`;
  else if(action==='members')return fail('Members cannot be deleted. Renew the membership or move an expired member to Lead.',403);
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
  if(req.method==='POST'&&!canCreateGymAdmin(publicUser(u)))return fail('This account cannot create organization admins',403);
  if(u.role!=='superadmin')return fail('Superadmin access required',403);
  if(req.method==='GET')return response((await sql`SELECT id,public_id,name,role,email,phone,pending_phone,password_ready,gym_name,gym_address,gym_phone,gym_website,gym_gst_number,gym_gst_rate,created_by,gym_logo FROM users WHERE role='admin' AND archived_at IS NULL ORDER BY id DESC`).map(publicUser));
  if(req.method==='POST'){const b=await req.json();if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100)return fail('Enter a name',400);if(typeof b.gymName!=='string'||!b.gymName.trim()||b.gymName.trim().length>100)return fail('Enter a organization name',400);const phone=normalizeWhatsAppPhone(b.gymPhone,b.gymCountry);if(!phone)return fail('Invalid phone number',400);const password=await hashPassword(randomBytes(32).toString('hex'));const gymLogo=await normalizeMemberPicture(b.gymLogo);if(!gymLogo)return fail('Upload a organization logo',400);const branding=normalizeGymBranding(b);if(!normalizeEmail(b.email))return fail('Enter a organization email',400);const limits=normalizeSubscription(b);const [admin]=await sql`WITH added AS (INSERT INTO users(name,password,role,phone,email,created_by,gym_name,gym_logo,gym_address,gym_phone,gym_website,gym_gst_number,gym_gst_rate) VALUES(${b.name.trim()},${password},'admin',${phone},${normalizeEmail(b.email)},${u.id},${b.gymName.trim()},${'data:image/jpeg;base64,'+gymLogo},${branding.address},${branding.phone},${branding.website},${branding.gstNumber},${branding.gstRate}) RETURNING id,public_id,name,role,email,phone,pending_phone,password_ready,gym_name,gym_address,gym_phone,gym_website,gym_gst_number,gym_gst_rate,created_by,gym_logo) , configured AS (INSERT INTO gym_subscriptions(admin_id,valid_from,valid_until,member_limit,manager_limit,supervisor_limit,branch_limit) SELECT id,${limits.validFrom}::date,${limits.validUntil}::date,${limits.memberLimit},${limits.managerLimit},${limits.supervisorLimit},${limits.branchLimit} FROM added RETURNING admin_id) SELECT added.* FROM added JOIN configured ON configured.admin_id=added.id`;return response(publicUser(admin),201);}
 }
 if(action==='supervisors') {
  if(!['superadmin','admin'].includes(u.role))return fail('Admin or superadmin access required',403);
  if(req.method==='GET'){const rows=u.role==='superadmin'?await sql`SELECT s.id,s.public_id,s.name,s.role,s.employee_role_id,(SELECT name FROM employee_roles er WHERE er.id=s.employee_role_id AND er.admin_id=s.created_by) AS employee_role_name,s.email,s.phone,s.pending_phone,s.password_ready,s.created_by,s.location_id,(SELECT name FROM gym_locations WHERE id=s.location_id) AS location_name,COALESCE(NULLIF(a.gym_name,''),a.name) AS gym_name FROM users s LEFT JOIN users a ON s.created_by=a.id AND a.role='admin' WHERE s.archived_at IS NULL AND gym_account_enabled(s.id) AND s.role='supervisor' ORDER BY s.id DESC`:await sql`SELECT s.id,s.public_id,s.name,s.role,s.employee_role_id,(SELECT name FROM employee_roles er WHERE er.id=s.employee_role_id AND er.admin_id=s.created_by) AS employee_role_name,s.email,s.phone,s.created_by,s.location_id,(SELECT name FROM gym_locations WHERE id=s.location_id) AS location_name,COALESCE(NULLIF(a.gym_name,''),a.name) AS gym_name FROM users s LEFT JOIN users a ON s.created_by=a.id AND a.role='admin' WHERE s.archived_at IS NULL AND gym_account_enabled(s.id) AND s.role='supervisor' AND s.created_by=${u.id} ORDER BY s.id DESC`;return response(rows.map(publicUser));}
  if(req.method==='POST')return fail('Only the assigned location manager can create supervisors',403);
 }
 if(action==='plans'){
  if(req.method==='GET'&&u.role==='superadmin')return response(await sql`SELECT p.id,p.name,p.duration_days,p.amount,p.description,COALESCE(NULLIF(u.gym_name,''),u.name) AS admin_name FROM plans p JOIN users u ON p.admin_id=u.id WHERE p.archived=FALSE ORDER BY p.id DESC`);
  if(u.role==='manager'&&['POST','PATCH'].includes(req.method))return fail('Only organization admins can create or edit plans',403);
  if(!['admin','manager'].includes(u.role)&&!(u.role==='superadmin'&&req.method==='PATCH'))return fail('Admin access required',403);
  if(req.method==='GET')return response(await sql`SELECT id,name,duration_days,amount,description FROM plans WHERE admin_id=${gymId} AND archived=FALSE ORDER BY id DESC`);
  if(['POST','PATCH'].includes(req.method)){
   const b=await req.json(),plan=validatePlan(b);if(plan.error)return fail(plan.error,400);
   if(req.method==='PATCH'){
    if(!Number.isInteger(b.id)||b.id<=0)return fail('Invalid plan',400);
    const [updated]=await sql`UPDATE plans SET name=${plan.name},duration_days=${plan.durationDays},amount=${plan.amount},description=${plan.description} WHERE id=${b.id} AND (${u.role}='superadmin' OR admin_id=${gymId}) AND archived=FALSE RETURNING id,name,duration_days,amount,description`;
    return updated?response(updated):fail('Plan not found',404);
   }
   const adminId=u.role==='admin'?u.id:Number(b.adminId);
   if(!Number.isInteger(adminId)||adminId<1)return fail('Select a organization',400);
   const [gym]=await sql`SELECT id FROM users WHERE id=${adminId} AND role='admin'`;if(!gym)return fail('Select a valid organization',400);
   const [created]=await sql`INSERT INTO plans(admin_id,name,duration_days,amount,description) VALUES(${adminId},${plan.name},${plan.durationDays},${plan.amount},${plan.description}) ON CONFLICT DO NOTHING RETURNING id,name,duration_days,amount,description`;
   return created?response(created,201):fail('Plan already exists',409);
  }
 }
 if(action==='member-registration'&&req.method==='POST'){
  if(!['admin','manager'].includes(u.role))return fail('Admin access required',403);
  await sql`DELETE FROM member_registrations WHERE expires_at<NOW()`;
  const registrationToken=randomBytes(32).toString('hex');
  const [reserved]=await sql`INSERT INTO member_registrations(token_hash,admin_id,member_id,public_id) VALUES(${tokenHash(registrationToken)},${gymId},nextval(pg_get_serial_sequence('members','id')),gym_next_public_id('mem','gym_member_ids')) RETURNING member_id,public_id,expires_at`;
  return response({registrationToken,registrationNo:reserved.public_id,expiresAt:reserved.expires_at},201);
 }
 if(action==='member-photo'&&req.method==='GET'){
  const id=Number(new URL(req.url).searchParams.get('id'));if(!Number.isInteger(id)||id<1)return fail('Not found',404);
  const [picture]=u.role==='superadmin'?await sql`SELECT p.data FROM member_pictures p JOIN members m ON m.id=p.member_id WHERE m.id=${id}`:await sql`SELECT p.data FROM member_pictures p JOIN members m ON m.id=p.member_id WHERE m.id=${id} AND m.admin_id=${['manager','supervisor'].includes(u.role)?u.created_by:u.id} AND (${!['manager','supervisor'].includes(u.role)} OR m.location_id=${u.location_id||null})`;
  if(!picture)return fail('Not found',404);
  return new Response(Buffer.from(picture.data,'base64'),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(action==='members') {
 const includeArchived=new URL(req.url).searchParams.get('includeArchived')==='1';
  if(u.role==='supervisor')return fail('Supervisor access is limited to the QR scanner and attendance sheet',403);
  if(req.method==='PATCH'){
   if(!['admin','manager','superadmin'].includes(u.role))return fail('Admin access required',403);
   const b=await req.json();if(!Number.isInteger(b.id)||b.id<1)return fail('Invalid member',400);
   const [existing]=await sql`SELECT *,GREATEST(COALESCE((SELECT amount FROM plans WHERE id=members.plan_id),0),COALESCE((SELECT (amount-COALESCE(addon_amount,0))/COALESCE(duration_months,1) FROM membership_assignments WHERE member_id=members.id AND superseded_by IS NULL ORDER BY id DESC LIMIT 1),0)) AS current_plan_amount,to_char(valid_from,'YYYY-MM-DD') AS valid_from,to_char(valid_to,'YYYY-MM-DD') AS valid_to,to_char(dob,'YYYY-MM-DD') AS dob FROM members WHERE id=${b.id} AND (${u.role}='superadmin' OR admin_id=${gymId}) AND (${!branch} OR location_id=${branch})`;
   if(!existing||branch&&existing.location_id!==branch)return fail('Member not found',404);
   const validFrom=existing.plan_id?String(existing.valid_from).slice(0,10):b.validFrom,validTo=existing.plan_id?String(existing.valid_to).slice(0,10):b.validTo;
   if(existing.plan_id&&(b.validFrom!==undefined&&b.validFrom!==validFrom||b.validTo!==undefined&&b.validTo!==validTo))return fail('Membership dates cannot be changed while editing member details',409);
   if(existing.gender&&b.gender!==undefined&&b.gender!==existing.gender)return fail('Gender cannot be changed once saved',409);
   if(fixedDateOfBirth(existing.dob,b.dob))return fail('Date of birth cannot be changed once saved',409);
   const requestedPlanId=Number(b.planId??existing.plan_id);
   const [requestedPlan]=await sql`SELECT id,name,amount FROM plans WHERE id=${requestedPlanId} AND admin_id=${existing.admin_id} AND (archived=FALSE OR id=${existing.plan_id})`;
   if(!canUpgradePlan(existing.plan_id,existing.current_plan_amount,requestedPlan))return fail('Select your current plan or a higher-priced plan. Downgrades are not allowed.',409);
   const m=validateMember({...b,groupName:b.groupName??existing.group_name,gender:existing.gender||b.gender,dob:b.dob===undefined?existing.dob:b.dob,planId:requestedPlanId,validFrom,validTo});if(m.error)return fail(m.error,400);
   if(branch&&(b.locationId!==undefined&&Number(b.locationId)!==branch||b.locationName!==undefined&&b.locationName.trim().toLowerCase()!==u.location_name.toLowerCase()))return fail('Use your assigned location',403);
   const location=await resolveGymLocation(sql,existing.admin_id,b.locationName!==undefined||b.locationId!==undefined?b:{locationId:existing.location_id});
   if(m.groupName!=='Default'&&!(await sql`SELECT id FROM gym_member_groups WHERE admin_id=${existing.admin_id} AND name=${m.groupName}`).length)return fail('Select a valid group',400);
   const picture=b.profilePicture===undefined?null:await normalizeMemberPicture(b.profilePicture);
   const updated=await updateMemberWithUpgrade(sql,{user:u,gymId,branch,existing,member:m,location,picture,photoChanged:b.profilePicture!==undefined});
   return updated.length?response({memberId:updated[0].public_id}):fail('Member changed or plan upgrade is unavailable. Reload the member and try again.',409);
  }
  if(req.method==='GET'){const rows=u.role==='superadmin'?await sql`SELECT m.*,COALESCE((SELECT p.name FROM plans p WHERE p.id=m.plan_id),m.plan) AS plan,GREATEST(COALESCE((SELECT amount FROM plans WHERE id=m.plan_id),0),COALESCE((SELECT (amount-COALESCE(addon_amount,0))/COALESCE(duration_months,1) FROM membership_assignments WHERE member_id=m.id AND superseded_by IS NULL ORDER BY id DESC LIMIT 1),0)) AS current_plan_amount,(SELECT name FROM gym_locations WHERE id=m.location_id) AS "locationName",(SELECT COALESCE(NULLIF(gym_owner.gym_name,''),gym_owner.name) FROM users gym_owner WHERE gym_owner.id=m.admin_id) AS "gymName",to_char(m.joined,'YYYY-MM-DD') AS joined,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,to_char(m.dob,'YYYY-MM-DD') AS dob,EXISTS(SELECT 1 FROM member_pictures p WHERE p.member_id=m.id) AS has_picture FROM members m WHERE (m.archived_at IS NULL OR ${includeArchived}) ORDER BY m.id DESC`:await sql`SELECT m.*,COALESCE((SELECT p.name FROM plans p WHERE p.id=m.plan_id),m.plan) AS plan,GREATEST(COALESCE((SELECT amount FROM plans WHERE id=m.plan_id),0),COALESCE((SELECT (amount-COALESCE(addon_amount,0))/COALESCE(duration_months,1) FROM membership_assignments WHERE member_id=m.id AND superseded_by IS NULL ORDER BY id DESC LIMIT 1),0)) AS current_plan_amount,(SELECT name FROM gym_locations WHERE id=m.location_id) AS "locationName",(SELECT COALESCE(NULLIF(gym_owner.gym_name,''),gym_owner.name) FROM users gym_owner WHERE gym_owner.id=m.admin_id) AS "gymName",to_char(m.joined,'YYYY-MM-DD') AS joined,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,to_char(m.dob,'YYYY-MM-DD') AS dob,EXISTS(SELECT 1 FROM member_pictures p WHERE p.member_id=m.id) AS has_picture FROM members m WHERE (m.archived_at IS NULL OR ${includeArchived}) AND m.admin_id=${gymId} AND (${!branch} OR m.location_id=${branch}) ORDER BY m.id DESC`;return response(rows.map(({password,password_ready,...m})=>({...m,age:m.dob?ageFromDateOfBirth(m.dob):m.age,status:m.archived_at?'Inactive':m.status,userType:'ME',registrationNo:m.public_id,memberId:m.public_id,profilePictureUrl:m.has_picture?'/api/member-photo?id='+m.id:null})));}
  if(req.method==='POST'){
   if(!['admin','manager'].includes(u.role))return fail('Sign in as an admin to add members',403);
   const b=await req.json(),m=validateMember(b);if(m.error)return fail(m.error,400);
   if(m.groupName!=='Default'&&!(await sql`SELECT id FROM gym_member_groups WHERE admin_id=${gymId} AND name=${m.groupName}`).length)return fail('Select a valid group',400);
   if(!PAYMENT_MODES.includes(b.paymentMode))return fail('Select Cash or Online payment',400);
   if(typeof b.registrationToken!=='string'||!/^[a-f0-9]{64}$/.test(b.registrationToken))return fail('Reopen Add Member to generate a registration number',400);
   if(branch&&(b.locationId!==undefined&&Number(b.locationId)!==branch||b.locationName!==undefined&&b.locationName.trim().toLowerCase()!==u.location_name.toLowerCase()))return fail('Use your assigned location',403);
   const location=await resolveGymLocation(sql,gymId,branch?{locationId:branch}:b);
   const charge=await registrationCharge(sql,gymId,m.planId,b);
   if(charge.error)return fail(charge.error,400);
   const picture=await normalizeMemberPicture(b.profilePicture);
   const created=await createRegisteredMember(sql,{gymId,m,location,picture,b,token:tokenHash(b.registrationToken),...charge});
   if(!created)return fail('Plan, add-on price or registration changed. Reopen Add Member.',400);
   after(async()=>{try{await sendPaymentPass(sql,u,{memberId:created.id});}catch{console.error('Automatic registration WhatsApp delivery failed');}});
   return response({memberId:created.public_id,registrationNo:created.public_id},201);
  }
 }
 return fail('Method not allowed',405);
}catch(error){const limitMessage=subscriptionError(error);if(limitMessage)return fail(limitMessage,409);if(/^(Enter a valid subscription|Subscription end|Limits must)/.test(error.message))return fail(error.message,400);if(error.message==='PHONE_IN_USE'||['users_unique_phone','members_unique_phone','account_phone_registry_pkey'].includes(error.constraint))return fail('This phone number is already registered to another user',409);if(error.message==='INVALID_ACCOUNT_PHONE')return fail('Enter a valid phone number',400);if(error.code==='GYM_BRANDING_INVALID')return fail(error.message,400);if(error.message==='GYM_LOCATION_REQUIRED')return fail('Select or type a location',400);if(error.message==='INVALID_GYM_LOCATION')return fail('Select a location belonging to this organization',400);if(error.message==='INVALID_PICTURE')return fail('Choose a valid JPG, PNG or WebP picture up to 2 MB',400);if(error.code==='23505')return fail('Plan already exists',409);if(error.code==='23503')return fail('This record has linked members, memberships or payments.',409);if(error.message==='DATABASE_NOT_CONFIGURED')return fail('Service is not configured. Contact your administrator.',503);if(error instanceof SyntaxError)return fail('Invalid request',400);console.error('Database request failed:',error.code||'connection error');return fail('Unable to load data. Please retry.',503);}
}
export {handle as GET,handle as POST,handle as DELETE,handle as PATCH};
