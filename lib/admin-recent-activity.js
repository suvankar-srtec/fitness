import {NextResponse} from 'next/server.js';
export async function recordGymScan(sql,user,{memberId=null,result,reason}){
 await sql`INSERT INTO gym_scan_events(admin_id,location_id,supervisor_id,member_id,result,reason) VALUES(${user.created_by},${user.location_id},${user.id},${memberId},${result},${reason})`;
}
export async function adminRecentActivity(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(user.role!=='admin')return reply({error:'Gym admin access required'},403);
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 const scans=await sql`SELECT e.id,e.result,e.reason,e.occurred_at AS "scannedAt",m.name,m.public_id AS "memberId",l.name AS location FROM gym_scan_events e LEFT JOIN members m ON m.id=e.member_id JOIN gym_locations l ON l.id=e.location_id WHERE e.admin_id=${user.id} ORDER BY e.occurred_at DESC,e.id DESC LIMIT 10`;
 return reply({scans});
}
