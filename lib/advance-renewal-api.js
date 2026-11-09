import {NextResponse} from 'next/server.js';
import {memberToday} from './members.mjs';
export async function advanceRenewal(req,u,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!['admin','manager'].includes(u.role))return reply({error:'Admin or manager access required'},403);
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const gym=u.role==='manager'?u.created_by:u.id,branch=u.role==='manager'?u.location_id:null;
 if(u.role==='manager'&&!branch)return reply({error:'Assigned location required'},403);
 const b=await req.json(),id=Number(b.memberId),today=memberToday();
 if(!Number.isInteger(id)||id<1||!['Cash','Online'].includes(b.method)||typeof b.requestKey!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestKey))return reply({error:'Select a member and payment mode'},400);
 const [,rows]=await sql.transaction([
 sql`SELECT pg_advisory_xact_lock(7482,${id})`,
 sql`WITH selected AS MATERIALIZED (
 SELECT m.id,m.plan_id,m.valid_from,m.valid_to,p.name,p.amount,p.duration_days,
 CASE WHEN m.valid_to>=${today}::date THEN m.valid_to+1 ELSE ${today}::date END AS starts
 FROM members m JOIN plans p ON p.id=m.plan_id AND p.admin_id=m.admin_id
 WHERE m.id=${id} AND m.admin_id=${gym} AND (${!branch} OR m.location_id=${branch}) AND m.archived_at IS NULL AND m.status='Active' AND p.archived=FALSE AND p.amount>0 AND p.duration_days BETWEEN 1 AND 3650
 AND NOT EXISTS(SELECT 1 FROM membership_assignments WHERE member_id=m.id AND request_key=${b.requestKey}) FOR UPDATE OF m
 ), added AS (
 INSERT INTO membership_assignments(admin_id,member_id,plan_id,plan_name,amount,paid,valid_from,valid_to,request_key)
 SELECT ${gym},id,plan_id,name,amount,amount,starts,starts+duration_days-1,${b.requestKey} FROM selected ON CONFLICT DO NOTHING RETURNING *
 ), updated AS (
 UPDATE members m SET valid_to=a.valid_to,valid_from=CASE WHEN m.valid_to>=${today}::date THEN m.valid_from ELSE a.valid_from END FROM added a WHERE m.id=a.member_id RETURNING m.id
 ), payment AS (
 INSERT INTO membership_payments(assignment_id,admin_id,amount,method,reference,paid_on,request_key) SELECT a.id,${gym},a.amount,${b.method},'',${today}::date,${b.requestKey} FROM added a JOIN updated m ON m.id=a.member_id RETURNING id
 ) SELECT id FROM payment UNION ALL SELECT p.id FROM membership_payments p JOIN membership_assignments a ON a.id=p.assignment_id JOIN members m ON m.id=a.member_id WHERE a.member_id=${id} AND a.admin_id=${gym} AND (${!branch} OR m.location_id=${branch}) AND p.request_key=${b.requestKey}`
 ]);
 return rows.length?reply({id:rows[0].id},201):reply({error:'Member or current plan unavailable. Reload and try again.'},409);
}
