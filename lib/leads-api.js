import {NextResponse} from 'next/server.js';
import {validateLead} from './leads.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function leadsApi(req,user,sql){
 if(user.role!=='admin')return reply({error:'Gym admin access required'},403);
 if(req.method==='GET')return reply(await sql`SELECT id,member_id,name,phone,gender,to_char(dob,'YYYY-MM-DD') AS dob,description,created_at FROM gym_leads WHERE admin_id=${user.id} ORDER BY created_at DESC,id DESC`);
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const b=await req.json();
 if(b.memberId!==undefined){
  if(!Number.isInteger(b.memberId)||b.memberId<1)return reply({error:'Invalid member'},400);
  const [lead]=await sql`WITH moved AS (UPDATE members SET archived_at=now(),status='Inactive' WHERE id=${b.memberId} AND admin_id=${user.id} AND archived_at IS NULL RETURNING *) INSERT INTO gym_leads(admin_id,member_id,name,phone,gender,dob,description) SELECT admin_id,id,name,COALESCE(phone,''),COALESCE(gender,'Other'),dob,'Returned from membership' FROM moved ON CONFLICT(member_id) DO UPDATE SET name=excluded.name,phone=excluded.phone,gender=excluded.gender,dob=excluded.dob,created_at=now() RETURNING id`;
  return lead?reply(lead,201):reply({error:'Member not found or already moved to Lead'},404);
 }
 const lead=validateLead(b);if(lead.error)return reply(lead,400);
 const [,rows]=await sql.transaction([sql`SELECT pg_advisory_xact_lock(hashtextextended(${user.id+':'+lead.phone},0))`,sql`INSERT INTO gym_leads(admin_id,name,phone,gender,dob,description) SELECT ${user.id},${lead.name},${lead.phone},${lead.gender},${lead.dob}::date,${lead.description} WHERE NOT EXISTS(SELECT 1 FROM gym_leads WHERE admin_id=${user.id} AND phone=${lead.phone}) RETURNING id`]);
 return rows.length?reply(rows[0],201):reply({error:'A lead with this number already exists'},409);
}
