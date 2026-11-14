import {NextResponse} from 'next/server.js';
import {randomBytes} from 'node:crypto';
import {hashPassword} from './password.mjs';
import {normalizeEmail} from './email-otp.mjs';
import {normalizeWhatsAppPhone} from './whatsapp.mjs';
import {resolveGymLocation} from './gym-locations.mjs';
import {publicUser} from './user-profile.mjs';
export async function employeesApi(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 const fail=(error,status)=>reply({error},status);
 if(!['admin','manager','superadmin'].includes(user.role))return fail('Access denied',403);
 const gym=user.role==='manager'?user.created_by:user.id,branch=user.role==='manager'?user.location_id:null;
 if(user.role==='manager'&&!branch)return fail('Assigned location required',403);
 if(!['POST','PATCH'].includes(request.method))return fail('Method not allowed',405);
 const body=await request.json();
 if(!['manager','supervisor'].includes(body.role))return fail('Select an employee role',400);
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)return fail('Enter a name',400);
 const phone=normalizeWhatsAppPhone(body.phone,body.country);
 if(!phone)return fail('Invalid phone number',400);
 const email=normalizeEmail(body.email);
 if(body.password)return fail('Employees set their own password through verification',400);
 if(request.method==='POST'){
  if(user.role==='superadmin')return fail('Only gym staff can add employees',403);
  if(body.gymAdminId!==undefined&&Number(body.gymAdminId)!==gym)return fail('Use your own gym',403);
  if(branch&&(body.locationId!==undefined&&Number(body.locationId)!==branch||body.locationName!==undefined&&String(body.locationName).trim().toLowerCase()!==String(user.location_name||'').toLowerCase()))return fail('Use your assigned location',403);
  const location=await resolveGymLocation(sql,gym,branch?{locationId:branch}:body);
  const password=await hashPassword(randomBytes(32).toString('hex'));
  const [employee]=await sql`INSERT INTO users(name,password,role,phone,email,created_by,location_id,manager_id) VALUES(${body.name.trim()},${password},${body.role},${phone},${email},${gym},${location.id},${user.role==='manager'&&body.role==='supervisor'?user.id:null}) RETURNING *`;
  return reply(publicUser({...employee,gym_name:user.gym_name,location_name:location.name}),201);
 }
 if(!Number.isInteger(body.id)||body.id<1)return fail('Select an employee',400);
 const [target]=await sql`SELECT * FROM users WHERE id=${body.id} AND role IN ('manager','supervisor') AND archived_at IS NULL AND (${user.role==='superadmin'} OR created_by=${gym}) AND (${!branch} OR location_id=${branch})`;
 if(!target)return fail('Employee not found',404);

 if(body.id===user.id&&body.role!==target.role)return fail('You cannot change your own role',403);
 if(body.gymAdminId!==undefined&&Number(body.gymAdminId)!==target.created_by)return fail('Use the employee gym',403);
 if(branch&&(body.locationId!==undefined&&Number(body.locationId)!==branch||body.locationName!==undefined&&String(body.locationName).trim().toLowerCase()!==String(user.location_name||'').toLowerCase()))return fail('Use your assigned location',403);
 const location=await resolveGymLocation(sql,target.created_by,branch?{locationId:branch}:body);
 const changed=body.role!==target.role||location.id!==target.location_id;
 const [updated]=await sql`WITH updated AS (
  UPDATE users SET name=${body.name.trim()},phone=${phone},email=${email},role=${body.role},location_id=${location.id},manager_id=CASE WHEN ${changed} THEN NULL ELSE manager_id END WHERE id=${target.id} AND created_by=${target.created_by} AND role=${target.role} AND location_id=${target.location_id} AND archived_at IS NULL RETURNING *
 ), unlinked AS (
  UPDATE users SET manager_id=NULL WHERE manager_id=${target.id} AND ${changed} AND EXISTS(SELECT 1 FROM updated)
 ), revoked AS (
  DELETE FROM sessions WHERE user_id=${target.id} AND ${changed} AND EXISTS(SELECT 1 FROM updated)
 ) SELECT * FROM updated`;
 if(!updated)return fail('Employee changed. Refresh and try again.',409);
 return reply(publicUser({...updated,gym_name:user.role==='superadmin'?body.gymName:user.gym_name,location_name:location.name}));
}
