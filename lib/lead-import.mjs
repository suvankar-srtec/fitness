import {validateLead} from './leads.mjs';
export async function importLeads(body,user,sql){
 const gymId=user.role==='manager'?user.created_by:user.id;
 if(!['admin','manager'].includes(user.role)||user.role==='manager'&&!user.location_id)return {status:403,error:'Assigned organization staff access required'};
 if(!Array.isArray(body.rows)||!body.rows.length||body.rows.length>200)return {status:400,error:'Upload between 1 and 200 leads at a time'};
 const locations=await sql`SELECT id,name FROM gym_locations WHERE admin_id=${gymId} AND lower(trim(name))<>'main location'`;
 const errors=[],seen=new Set(),leads=[];
 body.rows.forEach((row,index)=>{
  const number=index+2;
  if(!row||typeof row!=='object'){errors.push(`Row ${number}: Invalid row`);return;}
  const lead=validateLead(row);
  if(lead.error){errors.push(`Row ${number}: ${lead.error}`);return;}
  if(seen.has(lead.phone)){errors.push(`Row ${number}: Duplicate phone number in file`);return;}
  seen.add(lead.phone);
  const name=String(row.location||'').trim();
  const location=name?locations.find(l=>l.name.trim().toLowerCase()===name.toLowerCase()):null;
  if(name&&!location){errors.push(`Row ${number}: Location does not exist`);return;}
  if(user.role==='manager'&&location&&location.id!==user.location_id){errors.push(`Row ${number}: Select your assigned location`);return;}
  leads.push({...lead,location_id:user.role==='manager'?user.location_id:location?.id||null});
 });
 if(errors.length)return {status:400,error:errors.slice(0,10).join('\n')+(errors.length>10?`\nAnd ${errors.length-10} more errors`: '')};
 // Match single-lead creation locks so concurrent uploads cannot create duplicate leads.
 const locks=[...leads].sort((a,b)=>a.phone.localeCompare(b.phone)).map(lead=>sql`SELECT pg_advisory_xact_lock(hashtextextended(${gymId+':'+lead.phone},0))`);
 const results=await sql.transaction([...locks,sql`INSERT INTO gym_leads(admin_id,location_id,name,phone,gender,dob,description) SELECT ${gymId},r.location_id,r.name,r.phone,r.gender,r.dob,r.description FROM jsonb_to_recordset(${JSON.stringify(leads)}::jsonb) AS r(location_id integer,name text,phone text,gender text,dob date,description text) WHERE NOT EXISTS(SELECT 1 FROM gym_leads existing WHERE existing.admin_id=${gymId} AND existing.phone=r.phone AND existing.activated_at IS NULL) RETURNING id`]);
 const imported=results.at(-1).length;
 return {status:201,imported,skipped:leads.length-imported};
}
