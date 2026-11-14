import {NextResponse} from 'next/server.js';
import {publicUser} from './user-profile.mjs';
import {ageFromDateOfBirth} from './members.mjs';
export async function workspaceApi(request,user,sql){
 const started=performance.now();
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store','Server-Timing':'workspace;dur='+(performance.now()-started).toFixed(1)}});
 if(!['admin','manager','superadmin'].includes(user.role))return reply({error:'Access denied'},403);
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 const owner=user.role==='superadmin',gym=user.role==='manager'?user.created_by:user.id,branch=user.role==='manager'?user.location_id:null;
 if(user.role==='manager'&&!branch)return reply({error:'Assigned location required'},403);
 const [data]=await sql`WITH member_rows AS (
  SELECT m.*,COALESCE(p.name,m.plan) AS plan_name,
   GREATEST(COALESCE(p.amount,0),COALESCE((latest.amount-COALESCE(latest.addon_amount,0))/COALESCE(latest.duration_months,1),0)) AS current_plan_amount,
   l.name AS "locationName",COALESCE(NULLIF(g.gym_name,''),g.name) AS "gymName",
   EXISTS(SELECT 1 FROM member_pictures picture WHERE picture.member_id=m.id) AS has_picture
  FROM members m LEFT JOIN plans p ON p.id=m.plan_id LEFT JOIN gym_locations l ON l.id=m.location_id JOIN users g ON g.id=m.admin_id
  LEFT JOIN LATERAL (SELECT amount,addon_amount,duration_months FROM membership_assignments WHERE member_id=m.id AND superseded_by IS NULL ORDER BY id DESC LIMIT 1) latest ON TRUE
  WHERE m.archived_at IS NULL AND (${owner} OR m.admin_id=${gym}) AND (${!branch} OR m.location_id=${branch})
 ), accounts AS (
  SELECT u.*,r.name AS employee_role_name,l.name AS location_name,
   CASE WHEN u.role IN ('manager','supervisor') THEN COALESCE(NULLIF(g.gym_name,''),g.name) ELSE u.gym_name END AS resolved_gym_name
  FROM users u LEFT JOIN users g ON g.id=u.created_by AND g.role='admin'
  LEFT JOIN gym_locations l ON l.id=u.location_id AND l.admin_id=u.created_by
  LEFT JOIN employee_roles r ON r.id=u.employee_role_id AND r.admin_id=u.created_by
  WHERE u.archived_at IS NULL AND (${owner} OR u.created_by=${gym}) AND (${!branch} OR u.location_id=${branch})
   AND (u.role IN ('manager','supervisor') AND gym_account_enabled(u.id) OR ${owner} AND u.role='admin' OR ${owner} AND u.role='superadmin' AND u.public_id='sp00')
 ), plan_rows AS (
  SELECT p.id,p.name,p.duration_days,p.amount,p.description,COALESCE(NULLIF(g.gym_name,''),g.name) AS admin_name
  FROM plans p JOIN users g ON g.id=p.admin_id WHERE p.archived=FALSE AND (${owner} OR p.admin_id=${gym})
 ) SELECT
  COALESCE((SELECT jsonb_agg(to_jsonb(m)-'password'-'password_ready' ORDER BY m.id DESC) FROM member_rows m),'[]'::jsonb) AS members,
  COALESCE((SELECT jsonb_agg(to_jsonb(a)-'password' ORDER BY a.id DESC) FROM accounts a),'[]'::jsonb) AS accounts,
  COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id DESC) FROM plan_rows p),'[]'::jsonb) AS plans`;
 const accounts=(data?.accounts||[]).map(account=>publicUser({...account,gym_name:account.resolved_gym_name}));
 const members=(data?.members||[]).map(({password,password_ready,plan_name,...member})=>({...member,plan:plan_name??member.plan,age:member.dob?ageFromDateOfBirth(member.dob):member.age,userType:'ME',registrationNo:member.public_id,memberId:member.public_id,profilePictureUrl:member.has_picture?'/api/member-photo?id='+member.id:null}));
 return reply({members,plans:data?.plans||[],admins:accounts.filter(account=>account.role==='admin'),superadmins:accounts.filter(account=>account.role==='superadmin'),managers:accounts.filter(account=>account.role==='manager'),supervisors:accounts.filter(account=>account.role==='supervisor')});
}
