import {NextResponse} from 'next/server.js';
import {validDate,memberToday} from './members.mjs';
export async function gymTimeReport(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!['admin','manager'].includes(user.role))return reply({error:'Admin or manager access required'},403);
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 if(user.role==='manager'&&!user.location_id)return reply({error:'Assigned location required'},403);
 const params=new URL(request.url).searchParams,from=params.get('from')||memberToday(),to=params.get('to')||from;
 if(!validDate(from)||!validDate(to)||from>to||(new Date(to)-new Date(from))/86400000>365)return reply({error:'Select a valid date range of at most 366 days'},400);
 const rows=await sql`SELECT a.id,m.public_id AS "memberId",m.name,m.phone,l.name AS location,to_char(a.attended_on,'YYYY-MM-DD') AS date,a.first_in_at AS "firstIn",a.last_out_at AS "lastOut",CASE WHEN a.last_out_at>=a.first_in_at THEN floor(extract(epoch FROM (a.last_out_at-a.first_in_at))/60)::int ELSE NULL END AS minutes FROM attendance a JOIN members m ON m.id=a.member_id LEFT JOIN gym_locations l ON l.id=m.location_id WHERE m.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null}) AND a.source='qr' AND a.status='Present' AND a.attended_on BETWEEN ${from}::date AND ${to}::date ORDER BY a.attended_on DESC,m.name,a.id`;
 return reply(rows);
}
