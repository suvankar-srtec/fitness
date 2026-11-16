import {NextResponse} from 'next/server.js';
import {normalizeWhatsAppPhone} from './whatsapp.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function memberTransferApi(request,user,sql){
 if(user.role!=='manager'||!user.created_by||!user.location_id)return reply({error:'Assigned location manager access required'},403);
 if(request.method==='GET'){
  const query=String(new URL(request.url).searchParams.get('search')||'').trim();if(query.length<3)return reply([]);
  const phone=normalizeWhatsAppPhone(query,'IN')||'';
  return reply(await sql`SELECT m.id,m.public_id AS "memberId",m.name,m.plan,m.status,to_char(m.valid_to,'YYYY-MM-DD') AS "validTo",m.location_id AS "locationId",l.name AS "locationName" FROM members m LEFT JOIN gym_locations l ON l.id=m.location_id WHERE m.admin_id=${user.created_by} AND m.archived_at IS NULL AND (m.phone=${phone} AND ${phone}<>'' OR lower(m.public_id)=lower(${query})) ORDER BY m.id DESC LIMIT 5`);
 }
 if(request.method!=='PATCH')return reply({error:'Method not allowed'},405);
 const body=await request.json();if(!Number.isInteger(body.id))return reply({error:'Select a member'},400);
 const [member]=await sql`UPDATE members SET location_id=${user.location_id},trainer_id=NULL WHERE id=${body.id} AND admin_id=${user.created_by} AND archived_at IS NULL AND location_id IS DISTINCT FROM ${user.location_id} AND EXISTS(SELECT 1 FROM gym_locations WHERE id=${user.location_id} AND admin_id=${user.created_by}) RETURNING id,public_id AS "memberId"`;
 return member?reply(member):reply({error:'Member not found or already at your location'},409);
}
