import {NextResponse} from 'next/server.js';
import {validDate} from './members.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function leadFollowupsApi(req,user,sql){
 if(!['admin','manager'].includes(user.role))return reply({error:'Staff access required'},403);
 const gym=user.role==='manager'?user.created_by:user.id,branch=user.role==='manager'?user.location_id:null;
 if(user.role==='manager'&&!branch)return reply({error:'Assigned location required'},403);
 if(!['GET','POST'].includes(req.method))return reply({error:'Method not allowed'},405);
 const b=req.method==='POST'?await req.json():Object.fromEntries(new URL(req.url).searchParams),id=Number(b.leadId);
 if(!Number.isSafeInteger(id)||id<1)return reply({error:'Invalid lead'},400);
 if(req.method==='GET')return reply(await sql`SELECT f.id,to_char(f.follow_up_date,'YYYY-MM-DD') AS date,f.description FROM lead_followups f JOIN gym_leads l ON l.id=f.lead_id WHERE l.id=${id} AND l.admin_id=${gym} AND (${!branch} OR l.location_id=${branch}) ORDER BY f.follow_up_date DESC,f.id DESC`);
 if(!validDate(b.date)||typeof b.description!=='string'||!b.description.trim()||b.description.length>2000)return reply({error:'Enter a date and description (up to 2000 characters)'},400);
 const [row]=await sql`INSERT INTO lead_followups(lead_id,follow_up_date,description,created_by) SELECT id,${b.date}::date,${b.description.trim()},${user.id} FROM gym_leads WHERE id=${id} AND admin_id=${gym} AND (${!branch} OR location_id=${branch}) RETURNING id`;
 return row?reply(row,201):reply({error:'Lead not found'},404);
}
