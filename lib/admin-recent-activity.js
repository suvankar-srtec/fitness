import {memberToday} from './members.mjs';
import {NextResponse} from 'next/server.js';
export async function recordGymScan(sql,user,{memberId=null,result,reason}){
 await sql`INSERT INTO gym_scan_events(admin_id,location_id,supervisor_id,member_id,result,reason) VALUES(${user.created_by},${user.location_id},${user.id},${memberId},${result},${reason})`;
}
export async function adminRecentActivity(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(user.role!=='admin')return reply({error:'Gym admin access required'},403);
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 const today=memberToday();
 const [scans,totals]=await Promise.all([
 sql`SELECT e.id,e.result,e.reason,e.occurred_at AS "scannedAt",m.name,m.public_id AS "memberId",l.name AS location FROM gym_scan_events e LEFT JOIN members m ON m.id=e.member_id JOIN gym_locations l ON l.id=e.location_id WHERE e.admin_id=${user.id} ORDER BY e.occurred_at DESC,e.id DESC LIMIT 10`,
 sql`SELECT count(*) FILTER(WHERE a.status='Present' AND a.source='qr')::int AS present,(count(*)-count(*) FILTER(WHERE a.status='Present' AND a.source='qr'))::int AS absent FROM members m LEFT JOIN attendance a ON a.member_id=m.id AND a.attended_on=${today}::date WHERE m.admin_id=${user.id} AND m.archived_at IS NULL AND m.joined<=${today}::date`
 ]);
 return reply({scans,summary:totals[0]||{present:0,absent:0}});
}
