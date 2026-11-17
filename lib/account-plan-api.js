import {NextResponse} from 'next/server.js';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function accountPlanApi(request,user,sql){
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 if(user.role==='member')return reply({organization:user.gym_name||'',plan:user.plan||'Not assigned',validFrom:user.valid_from||null,validTo:user.valid_to||null,status:user.status||'Active'});
 if(user.role==='superadmin')return reply({organization:'Membership Management System',plan:'Platform administration',status:'Active'});
 if(!['admin','manager','supervisor'].includes(user.role))return reply({error:'Access denied'},403);
 const owner=user.role==='admin'?user.id:user.created_by;
 if(!owner)return reply({error:'Organization not assigned'},403);
 const [plan]=await sql`SELECT COALESCE(NULLIF(g.gym_name,''),g.name) AS organization,'Organization subscription' AS plan,to_char(s.valid_from,'YYYY-MM-DD') AS "validFrom",to_char(s.valid_until,'YYYY-MM-DD') AS "validTo",CASE WHEN gym_subscription_active(g.id) THEN 'Active' ELSE 'Expired' END AS status FROM users g LEFT JOIN gym_subscriptions s ON s.admin_id=g.id WHERE g.id=${owner} AND g.role='admin' AND g.archived_at IS NULL`;
 return plan?reply(plan):reply({error:'Organization not found'},404);
}
