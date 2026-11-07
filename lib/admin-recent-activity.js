import {NextResponse} from 'next/server.js';
import {memberToday} from './members.mjs';
export async function recordGymScan(sql,user,{memberId=null,result,reason}){
 await sql`INSERT INTO gym_scan_events(admin_id,location_id,supervisor_id,member_id,result,reason) VALUES(${user.created_by},${user.location_id},${user.id},${memberId},${result},${reason})`;
}
export async function adminRecentActivity(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(user.role!=='admin')return reply({error:'Gym admin access required'},403);
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 const today=memberToday();
 const [scans,attendance]=await Promise.all([
  sql`SELECT e.id,e.result,e.reason,e.occurred_at AS "scannedAt",m.name,m.public_id AS "memberId",l.name AS location FROM gym_scan_events e LEFT JOIN members m ON m.id=e.member_id JOIN gym_locations l ON l.id=e.location_id WHERE e.admin_id=${user.id} ORDER BY e.occurred_at DESC,e.id DESC LIMIT 10`,
  sql`SELECT m.id,m.name,m.public_id AS "memberId",l.name AS location,CASE WHEN a.status='Present' AND a.source='qr' THEN 'Present' ELSE 'Absent' END AS status,CASE WHEN a.source='qr' THEN COALESCE(a.last_out_at,a.first_in_at,a.updated_at) ELSE NULL END AS "scannedAt" FROM members m LEFT JOIN gym_locations l ON l.id=m.location_id LEFT JOIN attendance a ON a.member_id=m.id AND a.attended_on=${today}::date WHERE m.admin_id=${user.id} AND m.archived_at IS NULL AND m.joined<=${today}::date ORDER BY CASE WHEN a.source='qr' THEN COALESCE(a.last_out_at,a.first_in_at,a.updated_at) ELSE NULL END DESC NULLS LAST,m.name,m.id LIMIT 10`
 ]);
 return reply({scans,attendance});
}
