import {gymTimeCalendar} from './gym-time-report.js';
import {videoApi} from './video-api.js';
import {NextResponse} from 'next/server.js';
import {randomBytes} from 'node:crypto';
import {loginPhone} from './phone-auth.mjs';
import {verifyPassword,tokenHash} from './password.mjs';
import {memberToday} from './members.mjs';
import {gatePassStatus} from './gate-pass.mjs';
import {gatePassApi} from './gate-pass-api.js';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const profile=m=>({id:m.id,role:'member',name:m.name,userId:m.public_id,gymName:m.gym_name,gymLogo:m.gym_logo||'',gymPhone:m.gym_phone,plan:m.plan,validFrom:m.valid_from,validTo:m.valid_to});
export function memberAccessError(m){if(m.archived_at||m.gym_archived||m.status!=='Active')return {error:'Membership is inactive. Contact us: '+(m.gym_phone||''),code:'MEMBER_INACTIVE'};if(gatePassStatus(m,memberToday())==='Expired')return {error:'Last plan expired. Contact us: '+(m.gym_phone||''),code:'MEMBERSHIP_EXPIRED'};if(gatePassStatus(m,memberToday())!=='Active')return {error:'Membership is not active yet. Contact us: '+(m.gym_phone||''),code:'MEMBER_INACTIVE'};return null;}
export async function memberLogin(request,sql){const b=await request.json(),phone=loginPhone(b.phone,b.country);if(!phone||typeof b.password!=='string'||!b.password)return reply({error:'Enter your mobile number and password'},400);
 const [rate]=await sql`INSERT INTO login_attempts(key,attempts) VALUES(${tokenHash('member-login:'+phone)},1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN 1 ELSE login_attempts.attempts+1 END,started_at=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN NOW() ELSE login_attempts.started_at END RETURNING attempts`;if(rate.attempts>30)return reply({error:'Too many attempts. Try again in 10 minutes.'},429);
 const [m]=await sql`SELECT m.*,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,g.gym_name,g.gym_logo,COALESCE(NULLIF(g.gym_phone,''),g.phone) AS gym_phone,g.archived_at AS gym_archived FROM members m JOIN users g ON g.id=m.admin_id JOIN account_phone_registry r ON r.source_table='members' AND r.record_id=m.id AND r.phone=m.phone WHERE m.phone=${phone}`;
 if(!m)return reply({error:'Invalid mobile number or password'},401);
 if(!m.password_ready)return reply({error:'Verify your WhatsApp number and set your password first.',code:'PASSWORD_SETUP_REQUIRED'},403);
 if(!m.password||!await verifyPassword(b.password,m.password))return reply({error:'Invalid mobile number or password'},401);
 const denied=memberAccessError(m);if(denied)return reply(denied,403);
 const token='m.'+randomBytes(32).toString('hex');const inserted=await sql`INSERT INTO member_sessions(token_hash,user_id,phone,expires_at) SELECT ${tokenHash(token)},id,phone,NOW()+INTERVAL '8 hours' FROM members WHERE id=${m.id} AND phone=${phone} AND password=${m.password} AND gym_member_enabled(id) RETURNING user_id`;if(!inserted.length)return reply({error:'Membership changed. Please sign in again.'},403);
 const result=reply(profile(m));result.cookies.set('session',token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:28800});return result;
}
export async function memberSession(action,request,sql,token){const [m]=await sql`SELECT m.*,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,g.gym_name,g.gym_logo,COALESCE(NULLIF(g.gym_phone,''),g.phone) AS gym_phone,g.archived_at AS gym_archived FROM member_sessions s JOIN members m ON m.id=s.user_id JOIN users g ON g.id=m.admin_id WHERE s.token_hash=${tokenHash(token)} AND s.phone=m.phone AND m.password_ready=TRUE AND s.expires_at>NOW()`;if(!m)return null;
 if(action==='logout'){await sql`DELETE FROM member_sessions WHERE token_hash=${tokenHash(token)}`;const r=reply({ok:true});r.cookies.delete('session');return r;}
 const denied=memberAccessError(m);if(denied)return reply(denied,403);
 if(['videos','video-stream'].includes(action))return videoApi(action,request,{...m,role:'member'},sql);
 if(action==='member-time-calendar')return gymTimeCalendar(request,{...m,role:'member'},sql);
 if(action==='me'&&request.method==='GET')return reply(profile(m));
 if(action==='member-pass'&&request.method==='GET'){const url=new URL(request.url);url.searchParams.set('id',String(m.id));return gatePassApi('gate-pass',new Request(url),{role:'admin',id:m.admin_id},sql);}
 return reply({error:'Member access is limited to your own pass'},403);
}
