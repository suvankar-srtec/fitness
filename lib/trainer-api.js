import {NextResponse} from 'next/server.js';
import {isTrainer} from './trainer-access.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function trainerApi(action,request,user,sql){
 const trainer=isTrainer(user),manager=user.role==='manager',admin=user.role==='admin';
 if(!trainer&&!manager&&!admin)return reply({error:'Access denied'},403);
 const gym=admin?user.id:user.created_by,branch=admin?null:user.location_id;
 if(!gym||!admin&&!branch)return reply({error:'Assigned location required'},403);
 if(action==='trainer-access'){
  if(!manager)return reply({error:'Only the assigned location manager can change trainer access'},403);
  if(request.method!=='PATCH')return reply({error:'Method not allowed'},405);
  const body=await request.json();if(!Number.isInteger(body.id)||typeof body.enabled!=='boolean')return reply({error:'Select a trainer and access status'},400);
  const [row]=await sql`WITH changed AS (UPDATE users t SET access_enabled=${body.enabled} WHERE t.id=${body.id} AND t.created_by=${gym} AND t.location_id=${branch} AND t.archived_at IS NULL AND t.role='supervisor' AND EXISTS(SELECT 1 FROM employee_roles r WHERE r.id=t.employee_role_id AND r.admin_id=t.created_by AND lower(r.name)='trainer') RETURNING t.id), revoked AS (DELETE FROM sessions WHERE user_id IN(SELECT id FROM changed) AND ${!body.enabled}) SELECT id FROM changed`;
  return row?reply({id:row.id,enabled:body.enabled}):reply({error:'Trainer not found in your location'},404);
 }
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 if(action==='trainers'){
  if(trainer)return reply({error:'Staff management access required'},403);
  const url=new URL(request.url),locationId=admin?Number(url.searchParams.get('locationId'))||null:branch,name=String(url.searchParams.get('locationName')||'').trim();
  return reply(await sql`SELECT t.id,t.name,t.public_id AS "userId" FROM users t JOIN employee_roles r ON r.id=t.employee_role_id AND r.admin_id=t.created_by JOIN gym_locations l ON l.id=t.location_id WHERE t.created_by=${gym} AND t.role='supervisor' AND lower(r.name)='trainer' AND gym_account_enabled(t.id) AND (${locationId}::integer IS NOT NULL AND t.location_id=${locationId} OR ${admin} AND ${locationId}::integer IS NULL AND lower(trim(l.name))=lower(${name})) ORDER BY lower(t.name),t.id`);
 }
 if(!trainer)return reply({error:'Trainer access required'},403);
 if(action==='trainer-workspace')return reply(await sql`SELECT m.id,m.name,m.public_id AS "memberId",m.phone,m.email,m.plan,m.status,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to FROM members m WHERE m.trainer_id=${user.id} AND m.admin_id=${gym} AND m.location_id=${branch} AND m.archived_at IS NULL ORDER BY m.id DESC`);
 if(action==='trainer-member-pass'){
  const id=Number(new URL(request.url).searchParams.get('id'));if(!Number.isInteger(id)||id<1)return reply({error:'Member not found'},404);
  const [member]=await sql`SELECT id FROM members WHERE id=${id} AND trainer_id=${user.id} AND admin_id=${gym} AND location_id=${branch} AND archived_at IS NULL`;
  if(!member)return reply({error:'Member not assigned to you'},404);
  const {gatePassApi}=await import('./gate-pass-api.js');return gatePassApi('gate-pass',request,{role:'manager',created_by:gym,location_id:branch},sql);
 }
 return reply({error:'Not found'},404);
}
