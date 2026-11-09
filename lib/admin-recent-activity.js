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
 const [scans,totals,attendance,revenue,members]=await Promise.all([
 sql`SELECT e.id,e.result,e.reason,e.occurred_at AS "scannedAt",m.name,m.public_id AS "memberId",CASE WHEN EXISTS(SELECT 1 FROM member_pictures p WHERE p.member_id=m.id) THEN '/api/member-photo?id='||m.id ELSE NULL END AS "photoUrl",l.name AS location FROM gym_scan_events e LEFT JOIN members m ON m.id=e.member_id JOIN gym_locations l ON l.id=e.location_id WHERE e.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR e.location_id=${user.location_id||null}) ORDER BY e.occurred_at DESC,e.id DESC LIMIT 10`,
 sql`SELECT count(*) FILTER(WHERE a.status='Present' AND a.source='qr')::int AS present,(count(*)-count(*) FILTER(WHERE a.status='Present' AND a.source='qr'))::int AS absent FROM members m LEFT JOIN attendance a ON a.member_id=m.id AND a.attended_on=${today}::date WHERE m.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null}) AND m.archived_at IS NULL AND m.joined<=${today}::date`,
 sql`SELECT to_char(d.day,'YYYY-MM-DD') AS date,count(a.id)::int AS count FROM generate_series(${today}::date-6,${today}::date,INTERVAL '1 day') d(day) LEFT JOIN (attendance a JOIN members m ON m.id=a.member_id AND m.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null})) ON a.attended_on=d.day::date AND a.status='Present' AND a.source='qr' GROUP BY d.day ORDER BY d.day`,
 sql`SELECT to_char(p.paid_on,'YYYY-MM-DD') AS date,p.method,sum(p.amount)::text AS amount FROM membership_payments p JOIN membership_assignments a ON a.id=p.assignment_id JOIN members m ON m.id=a.member_id WHERE a.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null}) GROUP BY p.paid_on,p.method ORDER BY p.paid_on`,
 sql`SELECT m.id,m.name,m.public_id AS "memberId",m.phone,m.plan,m.status,a.amount AS "planAmount",a.paid AS "paidAmount",(SELECT p.method FROM membership_payments p WHERE p.assignment_id=a.id ORDER BY p.paid_on DESC,p.id DESC LIMIT 1) AS "paymentMethod",to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,l.name AS "locationName",CASE WHEN EXISTS(SELECT 1 FROM member_pictures p WHERE p.member_id=m.id) THEN '/api/member-photo?id='||m.id ELSE NULL END AS "profilePictureUrl" FROM members m LEFT JOIN gym_locations l ON l.id=m.location_id LEFT JOIN LATERAL (SELECT ma.id,ma.amount,ma.paid FROM membership_assignments ma WHERE ma.member_id=m.id AND ma.superseded_by IS NULL ORDER BY ma.id DESC LIMIT 1) a ON TRUE WHERE m.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null}) AND m.archived_at IS NULL ORDER BY m.id DESC` 
 ]);
 return reply({scans,attendance,revenue,members,summary:totals[0]||{present:0,absent:0}});
}
