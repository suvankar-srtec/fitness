import {NextResponse} from 'next/server.js';
import {memberToday} from './members.mjs';
export async function employeeDetails(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!['admin','manager','superadmin'].includes(user.role))return reply({error:'Access denied'},403);
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 if(user.role==='manager'&&!user.location_id)return reply({error:'Assigned location required'},403);
 const id=Number(new URL(request.url).searchParams.get('id'));
 if(!Number.isInteger(id)||id<1)return reply({error:'Select an employee'},400);
 const day=memberToday();
 const [person]=await sql`SELECT u.id,u.name,u.phone,u.email,u.public_id AS "userId",l.name AS "locationName",CASE WHEN EXISTS(SELECT 1 FROM staff_attendance a WHERE a.user_id=u.id AND a.admin_id=u.created_by AND a.location_id=u.location_id AND a.attended_on=${day}::date) THEN 'Present' ELSE 'Absent' END AS "attendanceStatus" FROM users u LEFT JOIN gym_locations l ON l.id=u.location_id WHERE u.id=${id} AND u.role IN ('manager','supervisor') AND u.archived_at IS NULL AND (${user.role==='superadmin'} OR u.created_by=${user.role==='manager'?user.created_by:user.id}) AND (${user.role!=='manager'} OR u.location_id=${user.location_id||null})`;
 return person?reply({...person,date:day}):reply({error:'Employee not found'},404);
}
