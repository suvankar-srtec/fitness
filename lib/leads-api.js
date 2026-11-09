import {NextResponse} from 'next/server.js';
import {validateLead} from './leads.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function leadsApi(req,user,sql){
 if(!['admin','manager'].includes(user.role))return reply({error:'Gym staff access required'},403);
 const gymId=user.role==='manager'?user.created_by:user.id,branch=user.role==='manager'?user.location_id:null;
 if(user.role==='manager'&&!branch)return reply({error:'Assigned location required'},403);
 if(req.method==='GET')return reply(await sql`SELECT id,member_id,name,phone,gender,to_char(dob,'YYYY-MM-DD') AS dob,description,created_at FROM gym_leads WHERE admin_id=${gymId} AND (${!branch} OR location_id=${branch}) AND activated_at IS NULL ORDER BY created_at DESC,id DESC`);
 if(req.method==='PATCH'){
  const b=await req.json();if(!Number.isInteger(b.leadId)||b.leadId<1||!Number.isInteger(b.locationId)||b.locationId<1)return reply({error:'Select an existing gym location'},400);
  if(branch&&b.locationId!==branch)return reply({error:'Select your assigned location'},403);
  const [restored]=await sql`WITH restored AS (UPDATE members m SET archived_at=NULL,status='Active',location_id=l.id FROM gym_leads lead JOIN gym_locations l ON l.admin_id=lead.admin_id WHERE lead.id=${b.leadId} AND lead.admin_id=${gymId} AND (${!branch} OR lead.location_id=${branch}) AND lead.activated_at IS NULL AND lead.member_id=m.id AND m.admin_id=lead.admin_id AND m.archived_at IS NOT NULL AND l.id=${b.locationId} AND lower(trim(l.name))<>'main location' RETURNING m.id,lead.id AS lead_id) UPDATE gym_leads lead SET activated_at=now() FROM restored r WHERE lead.id=r.lead_id RETURNING r.id AS member_id`;
  return restored?reply(restored):reply({error:'Lead or location not found, or member is already active'},409);
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const b=await req.json();
 if(b.memberId!==undefined){
  if(!Number.isInteger(b.memberId)||b.memberId<1)return reply({error:'Invalid member'},400);
  const [lead]=await sql`WITH moved AS (UPDATE members SET archived_at=now(),status='Inactive' WHERE id=${b.memberId} AND admin_id=${gymId} AND (${!branch} OR location_id=${branch}) AND archived_at IS NULL RETURNING *) INSERT INTO gym_leads(admin_id,member_id,location_id,name,phone,gender,dob,description) SELECT admin_id,id,location_id,name,COALESCE(phone,''),COALESCE(gender,'Other'),dob,'Returned from membership' FROM moved ON CONFLICT(member_id) DO UPDATE SET location_id=excluded.location_id,name=excluded.name,phone=excluded.phone,gender=excluded.gender,dob=excluded.dob,created_at=now(),activated_at=NULL RETURNING id`;
  return lead?reply(lead,201):reply({error:'Member not found or already moved to Lead'},404);
 }
 const lead=validateLead(b);if(lead.error)return reply(lead,400);
 const [,rows]=await sql.transaction([sql`SELECT pg_advisory_xact_lock(hashtextextended(${gymId+':'+lead.phone},0))`,sql`INSERT INTO gym_leads(admin_id,location_id,name,phone,gender,dob,description) SELECT ${gymId},${branch},${lead.name},${lead.phone},${lead.gender},${lead.dob}::date,${lead.description} WHERE NOT EXISTS(SELECT 1 FROM gym_leads WHERE admin_id=${gymId} AND phone=${lead.phone} AND activated_at IS NULL) RETURNING id`]);
 return rows.length?reply(rows[0],201):reply({error:'A lead with this number already exists'},409);
}
