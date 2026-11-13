import {NextResponse} from 'next/server.js';
import {randomBytes} from 'node:crypto';
import {loginPhone} from './phone-auth.mjs';
import {verifyPassword,tokenHash} from './password.mjs';
import {sessionProfile} from './session-profile.mjs';
import {isMainSuperadmin} from './user-permissions.mjs';
import {normalizeLocationName} from './gym-locations.mjs';
import {memberProfile,memberAccessError} from './member-access.mjs';
import {withAuditActor} from './audit-database.mjs';

// One lookup/rate-limit round trip, then one authenticated session transaction.
export async function loginApi(request,sql,{memberOnly=false}={}){
 const started=performance.now(),timings=[];
 const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','Server-Timing':[...timings,'total;dur='+(performance.now()-started).toFixed(1)].join(', ')}});
 const fail=(error,status,code)=>reply({error,...(code?{code}:{})},status);
 const body=await request.json();
 if(typeof body.password!=='string'||!body.password)return fail('Enter your mobile number and password',400);
 const root=typeof body.userId==='string'&&body.userId.trim().toLowerCase()==='sp00',phone=root?null:loginPhone(body.phone,body.country);
 if(!root&&!phone)return fail('Enter a valid mobile number',400);
 const key=tokenHash(root?'sp00':phone),lookupStarted=performance.now();
 const [lookup]=await sql`WITH rate AS (
  INSERT INTO login_attempts(key,attempts) VALUES(${key},1)
  ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN 1 ELSE login_attempts.attempts+1 END,started_at=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN NOW() ELSE login_attempts.started_at END RETURNING attempts
 ), account AS (SELECT source_table,record_id FROM account_phone_registry WHERE phone=${phone}::text)
 SELECT rate.attempts,
 (SELECT to_jsonb(u)||jsonb_build_object('subscription_active',gym_subscription_active(CASE WHEN u.role='admin' THEN u.id ELSE u.created_by END),'account_enabled',gym_account_enabled(u.id),'gym_logo',CASE WHEN u.role IN ('manager','supervisor') THEN g.gym_logo ELSE u.gym_logo END,'gym_name',CASE WHEN u.role IN ('manager','supervisor') THEN COALESCE(NULLIF(g.gym_name,''),g.name) ELSE u.gym_name END,'location_name',l.name,'owner_gym_phone',COALESCE(NULLIF(g.gym_phone,''),g.phone),'gym_email',g.email,'owner_gym_website',g.gym_website)
  FROM users u LEFT JOIN users g ON g.id=u.created_by AND g.role='admin' LEFT JOIN gym_locations l ON l.id=u.location_id
  WHERE (${root} AND u.public_id='sp00' AND u.role='superadmin') OR (${!root} AND u.role IN ('admin','manager','supervisor') AND u.phone=${phone}::text AND EXISTS(SELECT 1 FROM account a WHERE a.source_table='users' AND a.record_id=u.id))) AS staff,
 (SELECT to_jsonb(m)||jsonb_build_object('subscription_active',gym_subscription_active(m.admin_id),'valid_from',to_char(m.valid_from,'YYYY-MM-DD'),'valid_to',to_char(m.valid_to,'YYYY-MM-DD'),'gym_name',g.gym_name,'gym_logo',g.gym_logo,'gym_phone',COALESCE(NULLIF(g.gym_phone,''),g.phone),'gym_archived',g.archived_at)
  FROM members m JOIN users g ON g.id=m.admin_id WHERE ${!root} AND m.phone=${phone}::text AND EXISTS(SELECT 1 FROM account a WHERE a.source_table='members' AND a.record_id=m.id)) AS member
 FROM rate`;
 timings.push('lookup;dur='+(performance.now()-lookupStarted).toFixed(1));
 if(!lookup||lookup.attempts>30)return fail('Too many attempts. Try again in 10 minutes.',429);
 const member=!!lookup.member,user=lookup.member||lookup.staff;
 if(!user||memberOnly&&!member||!member&&!user.account_enabled)return fail('Invalid mobile number or password',401);
 if(!root&&!user.password_ready)return fail('Verify your WhatsApp number and set your password first.',403,'PASSWORD_SETUP_REQUIRED');
 const passwordStarted=performance.now();
 if(!user.password||root&&!isMainSuperadmin({role:user.role,userId:user.public_id})||!await verifyPassword(body.password,user.password))return fail('Invalid mobile number or password',401);
 if(!root&&user.subscription_active===false)return fail('Gym subscription is not active. Contact superadmin.',403);
 timings.push('password;dur='+(performance.now()-passwordStarted).toFixed(1));
 if(member){const denied=memberAccessError(user);if(denied)return reply(denied,403);}
 else if(['manager','supervisor'].includes(user.role)&&(!user.created_by||!user.location_id||!normalizeLocationName(user.location_name)||!user.gym_name))return fail('Ask your gym admin to assign your gym and location',403);
 const token=(member?'m.':'')+randomBytes(32).toString('hex'),sessionStarted=performance.now();
 const audited=withAuditActor(sql,{...user,role:member?'member':user.role});
 const [,inserted]=await audited.transaction([
  audited`DELETE FROM login_attempts WHERE key=${key}`,
  member?audited`INSERT INTO member_sessions(token_hash,user_id,phone,expires_at) SELECT ${tokenHash(token)},id,phone,NOW()+INTERVAL '8 hours' FROM members WHERE id=${user.id} AND phone=${phone} AND password=${user.password} AND password_ready=TRUE AND gym_member_enabled(id) RETURNING user_id`:
  audited`INSERT INTO sessions(token_hash,user_id,expires_at) SELECT ${tokenHash(token)},id,NOW()+INTERVAL '8 hours' FROM users WHERE id=${user.id} AND role=${user.role} AND password=${user.password} AND (${root} OR phone=${phone}::text AND password_ready=TRUE) AND created_by IS NOT DISTINCT FROM ${user.created_by||null}::integer AND location_id IS NOT DISTINCT FROM ${user.location_id||null}::integer AND gym_account_enabled(id) RETURNING user_id`
 ]);
 if(!inserted.length)return fail('Account changed. Please sign in again.',403);
 timings.push('session;dur='+(performance.now()-sessionStarted).toFixed(1));
 const result=reply(member?memberProfile(user):sessionProfile(user));
 result.cookies.set('session',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:28800});return result;
}
