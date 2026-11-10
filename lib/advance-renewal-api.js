import {NextResponse} from 'next/server.js';
import {registrationPayment} from './payments.mjs';
import {memberToday} from './members.mjs';
export async function advanceRenewal(req,u,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!['admin','manager'].includes(u.role))return reply({error:'Admin or manager access required'},403);
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const gym=u.role==='manager'?u.created_by:u.id,branch=u.role==='manager'?u.location_id:null;
 if(u.role==='manager'&&!branch)return reply({error:'Assigned location required'},403);
 const b=await req.json(),id=Number(b.memberId),planId=Number(b.planId),months=Number(b.months),today=memberToday();
 if(!Number.isInteger(planId)||planId<1||![3,6,12].includes(months)||!['Advance','Renew'].includes(b.kind)||typeof b.trainer!=='boolean')return reply({error:'Select a plan, duration and renewal type'},400);
 if(!Number.isInteger(id)||id<1||!['Cash','Online'].includes(b.method)||typeof b.requestKey!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestKey))return reply({error:'Select a member and payment mode'},400);
 const paymentType=b.paymentType||'Full';
 if(!['Full','Part'].includes(paymentType)||paymentType==='Part'&&!registrationPayment('Part','9999999999.99',b.amount))return reply({error:'Enter a valid part payment'},400);
 const [,rows]=await sql.transaction([
 sql`SELECT pg_advisory_xact_lock(7482,${id})`,
 sql`WITH selected AS MATERIALIZED (
 SELECT m.id,p.id AS plan_id,m.valid_from,m.valid_to,p.name,p.amount*${months}::integer AS amount,
 CASE WHEN m.valid_to>=${today}::date THEN m.valid_to+1 ELSE ${today}::date END AS starts
 FROM members m JOIN plans p ON p.id=${planId} AND p.admin_id=m.admin_id LEFT JOIN plans current_plan ON current_plan.id=m.plan_id
 WHERE m.id=${id} AND m.admin_id=${gym} AND (${!branch} OR m.location_id=${branch}) AND m.archived_at IS NULL AND m.status='Active' AND p.archived=FALSE AND p.amount>0 AND (p.id=m.plan_id OR p.amount>=COALESCE(current_plan.amount,0))
 AND NOT EXISTS(SELECT 1 FROM membership_assignments WHERE member_id=m.id AND request_key=${b.requestKey}) FOR UPDATE OF m
 ), priced AS (SELECT *,CASE WHEN ${paymentType}='Full' THEN amount ELSE ${paymentType==='Part'?String(b.amount):'0'}::numeric END AS initial_paid FROM selected), added AS (
 INSERT INTO membership_assignments(admin_id,member_id,plan_id,plan_name,amount,paid,valid_from,valid_to,request_key,duration_months,trainer_included,renewal_kind)
 SELECT ${gym},id,plan_id,name,amount,initial_paid,starts,(starts+make_interval(months=>${months}::integer))::date-1,${b.requestKey},${months},${b.trainer},${b.kind} FROM priced WHERE initial_paid>0 AND initial_paid<=amount AND (${paymentType}='Full' OR initial_paid<amount) ON CONFLICT DO NOTHING RETURNING *
 ), updated AS (
 UPDATE members m SET plan_id=a.plan_id,plan=a.plan_name,valid_to=a.valid_to,valid_from=CASE WHEN m.valid_to>=${today}::date THEN m.valid_from ELSE a.valid_from END FROM added a WHERE m.id=a.member_id RETURNING m.id
 ), payment AS (
 INSERT INTO membership_payments(assignment_id,admin_id,amount,method,reference,paid_on,request_key) SELECT a.id,${gym},a.paid,${b.method},'',${today}::date,${b.requestKey} FROM added a JOIN updated m ON m.id=a.member_id RETURNING id
 ) SELECT id FROM payment UNION ALL SELECT p.id FROM membership_payments p JOIN membership_assignments a ON a.id=p.assignment_id JOIN members m ON m.id=a.member_id WHERE a.member_id=${id} AND a.admin_id=${gym} AND (${!branch} OR m.location_id=${branch}) AND p.request_key=${b.requestKey}`
 ]);
 return rows.length?reply({id:rows[0].id},201):reply({error:'Member or selected plan unavailable. Lower-priced plans cannot be selected.'},409);
}
