import {NextResponse} from 'next/server.js';
import {validDate,memberToday} from './members.mjs';
export async function gymTimeReport(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!['admin','manager'].includes(user.role))return reply({error:'Admin or manager access required'},403);
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 if(user.role==='manager'&&!user.location_id)return reply({error:'Assigned location required'},403);
 const params=new URL(request.url).searchParams,from=params.get('from')||memberToday(),to=params.get('to')||from;
 if(!validDate(from)||!validDate(to)||from>to||(new Date(to)-new Date(from))/86400000>365)return reply({error:'Select a valid date range of at most 366 days'},400);
 const rows=await sql`SELECT a.id,m.id AS "memberRecordId",m.public_id AS "memberId",m.name,m.phone,l.name AS location,to_char(a.attended_on,'YYYY-MM-DD') AS date,a.first_in_at AS "firstIn",a.last_out_at AS "lastOut",CASE WHEN a.last_out_at>=a.first_in_at THEN floor(extract(epoch FROM (a.last_out_at-a.first_in_at))/60)::int ELSE NULL END AS minutes FROM attendance a JOIN members m ON m.id=a.member_id LEFT JOIN gym_locations l ON l.id=m.location_id WHERE m.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null}) AND a.source='qr' AND a.status='Present' AND a.attended_on BETWEEN ${from}::date AND ${to}::date ORDER BY a.attended_on DESC,m.name,a.id`;
 return reply(rows);
}
import {calendarMonth} from './time-calendar.mjs';

export async function gymTimeCalendar(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!['admin','manager','member'].includes(user.role))return reply({error:'Access denied'},403);
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 const params=new URL(request.url).searchParams,range=calendarMonth(params.get('month')||memberToday().slice(0,7));
 if(!range)return reply({error:'Select a valid month'},400);
 // Member identity always comes from the authenticated session, never the query.
 const id=user.role==='member'?user.id:Number(params.get('memberId'));
 if(!Number.isInteger(id)||id<1)return reply({error:'Select a member'},400);
 if(user.role==='manager'&&!user.location_id)return reply({error:'Assigned location required'},403);
 const gymId=user.role==='member'?user.admin_id:user.role==='manager'?user.created_by:user.id;
 const [member]=await sql`SELECT m.id,m.public_id AS "memberId",m.name FROM members m WHERE m.id=${id} AND m.admin_id=${gymId} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null})`;
 if(!member)return reply({error:'Member not found'},404);
 const days=await sql`SELECT to_char(attended_on,'YYYY-MM-DD') AS date,first_in_at AS "firstIn",last_out_at AS "lastOut",CASE WHEN last_out_at>=first_in_at THEN floor(extract(epoch FROM(last_out_at-first_in_at))/60)::int ELSE NULL END AS minutes FROM attendance WHERE member_id=${member.id} AND source='qr' AND status='Present' AND attended_on BETWEEN ${range.from}::date AND ${range.to}::date ORDER BY attended_on`;
 return reply({member,days,month:range.from.slice(0,7)});
}
