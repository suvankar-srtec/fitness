import {gymWorkspaceScope} from './gym-workspace-scope.mjs';
import {memberToday} from './members.mjs';
import {NextResponse} from 'next/server.js';
export async function recordGymScan(sql,user,{memberId=null,result,reason}){
 await sql`INSERT INTO gym_scan_events(admin_id,location_id,supervisor_id,member_id,result,reason) VALUES(${user.created_by},${user.location_id},${user.id},${memberId},${result},${reason})`;
}
export async function adminRecentActivity(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!gymWorkspaceScope(user))return reply({error:'Gym admin access required'},403);
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 const today=memberToday();
 const [scans,totals,attendance]=await Promise.all([
 sql`SELECT e.id,e.result,e.reason,e.occurred_at AS "scannedAt",m.name,m.public_id AS "memberId",CASE WHEN EXISTS(SELECT 1 FROM member_pictures p WHERE p.member_id=m.id) THEN '/api/member-photo?id='||m.id ELSE NULL END AS "photoUrl",l.name AS location FROM gym_scan_events e LEFT JOIN members m ON m.id=e.member_id JOIN gym_locations l ON l.id=e.location_id WHERE e.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR e.location_id=${user.location_id||null}) ORDER BY e.occurred_at DESC,e.id DESC LIMIT 10`,
 sql`SELECT count(*) FILTER(WHERE a.status='Present' AND a.source='qr')::int AS present,(count(*)-count(*) FILTER(WHERE a.status='Present' AND a.source='qr'))::int AS absent FROM members m LEFT JOIN attendance a ON a.member_id=m.id AND a.attended_on=${today}::date WHERE m.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null}) AND m.archived_at IS NULL AND m.joined<=${today}::date`,
 sql`SELECT to_char(d.day,'YYYY-MM-DD') AS date,count(a.id)::int AS count FROM generate_series(${today}::date-6,${today}::date,INTERVAL '1 day') d(day) LEFT JOIN (attendance a JOIN members m ON m.id=a.member_id AND m.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null})) ON a.attended_on=d.day::date AND a.status='Present' AND a.source='qr' GROUP BY d.day ORDER BY d.day`
 ]);
 return reply({scans,attendance,summary:totals[0]||{present:0,absent:0}});
}
