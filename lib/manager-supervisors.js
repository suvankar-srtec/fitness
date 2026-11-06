import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {managerScope,supervisorAssignment,canManageBranchSupervisor} from './manager-permissions.mjs';
import {normalizeWhatsAppPhone} from './whatsapp.mjs';
import {hashPassword} from './password.mjs';
import {publicUser} from './user-profile.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status)=>reply({error},status);
export async function managerSupervisors(request,user,sql){
 const scope=managerScope(user);if(!scope)return fail('Assigned manager access required',403);
 const profile=row=>publicUser({...row,gym_name:user.gym_name,location_name:user.location_name});
 if(request.method==='GET')return reply((await sql`SELECT * FROM users WHERE archived_at IS NULL AND role='supervisor' AND created_by=${scope.gymId} AND location_id=${scope.locationId} ORDER BY id DESC`).map(profile));
 const body=await request.json();
 if(!supervisorAssignment(user,body))return fail('Supervisors must use your assigned gym and location',403);
 if(request.method==='POST'){
  if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)return fail('Enter a name',400);
  const phone=normalizeWhatsAppPhone(body.phone,body.country);if(!phone)return fail('Invalid phone number',400);
  const password=await hashPassword(randomBytes(32).toString('hex'));
  const [row]=await sql`INSERT INTO users(name,password,role,phone,created_by,location_id,manager_id) SELECT ${body.name.trim()},${password},'supervisor',${phone},m.created_by,m.location_id,m.id FROM users m WHERE m.id=${user.id} AND m.role='manager' AND m.created_by=${scope.gymId} AND m.location_id=${scope.locationId} RETURNING *`;
  return row?reply(profile(row),201):fail('Manager assignment changed. Sign in again.',403);
 }
 if(!Number.isInteger(body.id)||body.id<1)return fail('Invalid supervisor',400);
 const [target]=await sql`SELECT id,role,created_by,location_id FROM users WHERE id=${body.id} AND role='supervisor' AND created_by=${scope.gymId} AND location_id=${scope.locationId}`;
 if(!canManageBranchSupervisor(user,target))return fail('Supervisor not found in your location',404);
 if(request.method==='DELETE'){await sql`UPDATE users SET archived_at=NOW() WHERE archived_at IS NULL AND id=${target.id} AND role='supervisor' AND created_by=${scope.gymId} AND location_id=${scope.locationId}`;return reply({ok:true});}
 if(request.method!=='PATCH')return fail('Method not allowed',405);
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100||body.password!==undefined&&typeof body.password!=='string')return fail('Enter valid supervisor details',400);
 const phone=normalizeWhatsAppPhone(body.phone,body.country);if(!phone)return fail('Invalid phone number',400);
 if(body.password)return fail('Users set their own password through WhatsApp verification',400);
 const password=null;
 const [updated]=await sql.transaction([
  sql`UPDATE users SET name=${body.name.trim()},phone=${phone},password=COALESCE(${password},password) WHERE id=${target.id} AND role='supervisor' AND created_by=${scope.gymId} AND location_id=${scope.locationId} RETURNING *`,
  sql`DELETE FROM sessions WHERE user_id=${target.id} AND ${password}::text IS NOT NULL`
 ]);
 return updated[0]?reply(profile(updated[0])):fail('Supervisor no longer assigned to this location',404);
}
