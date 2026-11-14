import {importLeads} from './lead-import.mjs';
import {memberToday} from './members.mjs';
﻿import {NextResponse} from 'next/server.js';
import {validateLead} from './leads.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function leadsApi(req,user,sql){
 if(!['admin','manager'].includes(user.role))return reply({error:'Organization staff access required'},403);
 const gymId=user.role==='manager'?user.created_by:user.id,branch=user.role==='manager'?user.location_id:null;
 if(user.role==='manager'&&!branch)return reply({error:'Assigned location required'},403);
 if(req.method==='GET')return reply(await sql`SELECT lead.id,lead.member_id,lead.name,lead.phone,lead.gender,to_char(lead.dob,'YYYY-MM-DD') AS dob,lead.description,COALESCE((SELECT f.description FROM lead_followups f WHERE f.lead_id=lead.id ORDER BY f.follow_up_date DESC,f.id DESC LIMIT 1),lead.description) AS last_description,lead.created_at,lead.location_id,location.name AS location_name FROM gym_leads lead LEFT JOIN gym_locations location ON location.id=lead.location_id AND location.admin_id=lead.admin_id WHERE lead.admin_id=${gymId} AND (${!branch} OR lead.location_id=${branch}) AND lead.activated_at IS NULL ORDER BY lead.created_at DESC,lead.id DESC`);
 if(req.method==='PATCH'){
  const b=await req.json();if(!Number.isInteger(b.leadId)||b.leadId<1||!Number.isInteger(b.locationId)||b.locationId<1)return reply({error:'Select an existing location'},400);
  if(b.operation==='assign-location'){
   if(user.role!=='admin')return reply({error:'Only the organization admin can assign lead locations'},403);
   const [assigned]=await sql`UPDATE gym_leads lead SET location_id=location.id FROM gym_locations location WHERE lead.id=${b.leadId} AND lead.admin_id=${gymId} AND lead.activated_at IS NULL AND location.id=${b.locationId} AND location.admin_id=lead.admin_id AND lower(trim(location.name))<>'main location' RETURNING lead.id,lead.location_id,location.name AS location_name`;
   return assigned?reply(assigned):reply({error:'Lead or location not found'},404);
  }
  if(b.operation!==undefined)return reply({error:'Invalid lead operation'},400);
  if(branch&&b.locationId!==branch)return reply({error:'Select your assigned location'},403);
  const [restored]=await sql`WITH restored AS (UPDATE members m SET archived_at=NULL,status='Active',location_id=l.id FROM gym_leads lead JOIN gym_locations l ON l.admin_id=lead.admin_id WHERE lead.id=${b.leadId} AND lead.admin_id=${gymId} AND (${!branch} OR lead.location_id=${branch}) AND lead.activated_at IS NULL AND lead.member_id=m.id AND m.admin_id=lead.admin_id AND m.archived_at IS NOT NULL AND l.id=${b.locationId} AND lower(trim(l.name))<>'main location' RETURNING m.id,lead.id AS lead_id) UPDATE gym_leads lead SET activated_at=now() FROM restored r WHERE lead.id=r.lead_id RETURNING r.id AS member_id`;
  if(restored)return reply(restored);
  const [added]=await sql`WITH selected AS MATERIALIZED (SELECT lead.* FROM gym_leads lead JOIN gym_locations l ON l.admin_id=lead.admin_id AND l.id=${b.locationId} AND lower(trim(l.name))<>'main location' WHERE lead.id=${b.leadId} AND lead.admin_id=${gymId} AND (${!branch} OR lead.location_id=${branch}) AND lead.activated_at IS NULL AND lead.member_id IS NULL FOR UPDATE OF lead), added AS (INSERT INTO members(admin_id,location_id,name,phone,gender,dob,plan,status) SELECT admin_id,${b.locationId},name,phone,gender,dob,'Not assigned','Active' FROM selected RETURNING id), linked AS (UPDATE gym_leads l SET member_id=a.id,location_id=${b.locationId},activated_at=now() FROM added a,selected s WHERE l.id=s.id RETURNING a.id AS member_id) SELECT member_id FROM linked`;
  return added?reply(added):reply({error:'Lead or location not found, or member is already active'},409);
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const b=await req.json();
 if(b.operation==='import'){const result=await importLeads(b,user,sql);const {status,...data}=result;return reply(data,status);}
 if(b.memberId!==undefined){
  if(!Number.isInteger(b.memberId)||b.memberId<1)return reply({error:'Invalid member'},400);
  const [lead]=await sql`WITH moved AS (UPDATE members SET archived_at=now(),status='Inactive' WHERE id=${b.memberId} AND admin_id=${gymId} AND (${!branch} OR location_id=${branch}) AND archived_at IS NULL AND valid_to<${memberToday()}::date RETURNING *) INSERT INTO gym_leads(admin_id,member_id,location_id,name,phone,gender,dob,description) SELECT admin_id,id,location_id,name,COALESCE(phone,''),COALESCE(gender,'Other'),dob,'Returned from membership' FROM moved ON CONFLICT(member_id) DO UPDATE SET location_id=excluded.location_id,name=excluded.name,phone=excluded.phone,gender=excluded.gender,dob=excluded.dob,created_at=now(),activated_at=NULL RETURNING id`;
  return lead?reply(lead,201):reply({error:'Member must be expired and belong to your gym/location'},404);
 }
 const lead=validateLead(b);if(lead.error)return reply(lead,400);
 let leadLocation=branch;
 if(user.role==='admin'&&b.locationId!==undefined&&b.locationId!==''){
  const id=Number(b.locationId);if(!Number.isInteger(id)||id<1)return reply({error:'Select an existing location'},400);
  const [location]=await sql`SELECT id FROM gym_locations WHERE id=${id} AND admin_id=${gymId} AND lower(trim(name))<>'main location'`;
  if(!location)return reply({error:'Location not found'},404);
  leadLocation=location.id;
 }
 if(branch&&b.locationId!==undefined&&b.locationId!==''&&Number(b.locationId)!==branch)return reply({error:'Select your assigned location'},403);
 const [,rows]=await sql.transaction([sql`SELECT pg_advisory_xact_lock(hashtextextended(${gymId+':'+lead.phone},0))`,sql`INSERT INTO gym_leads(admin_id,location_id,name,phone,gender,dob,description) SELECT ${gymId},${leadLocation},${lead.name},${lead.phone},${lead.gender},${lead.dob}::date,${lead.description} WHERE NOT EXISTS(SELECT 1 FROM gym_leads WHERE admin_id=${gymId} AND phone=${lead.phone} AND activated_at IS NULL) RETURNING id`]);
 return rows.length?reply(rows[0],201):reply({error:'A lead with this number already exists'},409);
}
