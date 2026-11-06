import {NextResponse} from 'next/server';
import {publicUser} from './user-profile.mjs';
import {normalizeWhatsAppPhone} from './whatsapp.mjs';
import {hashPassword,tokenHash} from './password.mjs';
import {randomBytes} from 'node:crypto';
import {resolveGymLocation} from './gym-locations.mjs';
import {managerScope} from './manager-permissions.mjs';
import {memberToday} from './members.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status)=>reply({error},status);
export async function managerApi(action,request,user,sql){
 if(action==='manager-dashboard'){
  const scope=managerScope(user);if(!scope)return fail('Assigned manager access required',403);
  if(request.method!=='GET')return fail('Method not allowed',405);
  const today=memberToday();
  const [members,attendance]=await Promise.all([
   sql`SELECT id,public_id AS "memberId",name,phone,plan,status,to_char(joined,'YYYY-MM-DD') AS joined,to_char(valid_from,'YYYY-MM-DD') AS valid_from,to_char(valid_to,'YYYY-MM-DD') AS valid_to FROM members WHERE admin_id=${scope.gymId} AND location_id=${scope.locationId} ORDER BY name,id`,
   sql`SELECT a.member_id,to_char(a.attended_on,'YYYY-MM-DD') AS date FROM attendance a JOIN members m ON m.id=a.member_id WHERE m.admin_id=${scope.gymId} AND m.location_id=${scope.locationId} AND a.status='Present' AND a.source='qr' AND a.attended_on BETWEEN ${today}::date-29 AND ${today}::date`
  ]);
  return reply({today,members,attendance});
 }
 if(action==='manager-registration'){
  if(user.role!=='admin')return fail('Gym admin access required',403);
  if(request.method!=='POST')return fail('Method not allowed',405);
  await sql`DELETE FROM manager_registrations WHERE expires_at<NOW()`;
  const registrationToken=randomBytes(32).toString('hex');
  const [reservation]=await sql`INSERT INTO manager_registrations(token_hash,admin_id) SELECT ${tokenHash(registrationToken)},${user.id} WHERE (SELECT count(*) FROM manager_registrations WHERE admin_id=${user.id} AND expires_at>NOW())<30 RETURNING public_id`;
  return reservation?reply({userId:reservation.public_id,registrationToken},201):fail('Too many pending manager forms. Try again later.',429);
 }
 if(!['admin','superadmin'].includes(user.role))return fail('Gym admin access required',403);
 if(request.method==='GET'){
  const managers=await sql`SELECT m.*,g.gym_name,l.name AS location_name FROM users m JOIN users g ON g.id=m.created_by AND g.role='admin' JOIN gym_locations l ON l.id=m.location_id AND l.admin_id=m.created_by WHERE m.role='manager' AND (${user.role}='superadmin' OR m.created_by=${user.id}) ORDER BY m.id DESC`;
  return reply(managers.map(publicUser));
 }
 if(user.role!=='admin')return fail('Only gym admins can manage location managers',403);
 const body=await request.json();
 if(request.method==='POST'){
  if(typeof body.registrationToken!=='string'||!/^[a-f0-9]{64}$/.test(body.registrationToken))return fail('Reopen Add Manager to generate a user ID',400);
  if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)return fail('Enter a name',400);
  if(body.gymAdminId!==undefined&&Number(body.gymAdminId)!==user.id)return fail('Select your own gym',403);
  const phone=normalizeWhatsAppPhone(body.phone,body.country);if(!phone)return fail('Invalid phone number',400);
  const location=await resolveGymLocation(sql,user.id,body),password=await hashPassword(randomBytes(32).toString('hex'));
  const [manager]=await sql`WITH reserved AS (DELETE FROM manager_registrations WHERE token_hash=${tokenHash(body.registrationToken)} AND admin_id=${user.id} AND expires_at>NOW() RETURNING public_id) INSERT INTO users(public_id,name,password,role,phone,created_by,location_id) SELECT reserved.public_id,${body.name.trim()},${password},'manager',${phone},${user.id},${location.id} FROM reserved RETURNING *`;
  if(!manager)return fail('User ID expired or already used. Reopen Add Manager.',409);
  return reply(publicUser({...manager,gym_name:user.gym_name,location_name:location.name}),201);
 }
 if(!Number.isInteger(body.id)||body.id<1)return fail('Invalid manager',400);
 const [target]=await sql`SELECT * FROM users WHERE id=${body.id} AND role='manager' AND created_by=${user.id}`;
 if(!target)return fail('Manager not found',404);
 if(request.method==='DELETE'){await sql`DELETE FROM users WHERE id=${target.id} AND role='manager' AND created_by=${user.id}`;return reply({ok:true});}
 if(request.method!=='PATCH')return fail('Method not allowed',405);
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100||body.password!==undefined&&typeof body.password!=='string')return fail('Enter a valid name and password',400);
 if(body.gymAdminId!==undefined&&Number(body.gymAdminId)!==user.id)return fail('Select your own gym',403);
 const phone=normalizeWhatsAppPhone(body.phone,body.country);if(!phone)return fail('Invalid phone number',400);
 if(body.password)return fail('Users set their own password through WhatsApp verification',400);
 const location=await resolveGymLocation(sql,user.id,body),password=null;
 const result=await sql.transaction([
  sql`UPDATE users SET manager_id=NULL WHERE manager_id=${target.id} AND ${location.id!==target.location_id}`,
  sql`UPDATE users SET name=${body.name.trim()},phone=${phone},location_id=${location.id},password=COALESCE(${password},password) WHERE id=${target.id} AND role='manager' AND created_by=${user.id} RETURNING *`,
  sql`DELETE FROM sessions WHERE user_id=${target.id} AND (${location.id!==target.location_id} OR ${password}::text IS NOT NULL)`
 ]);
 return reply(publicUser({...result[1][0],gym_name:user.gym_name,location_name:location.name}));
}
