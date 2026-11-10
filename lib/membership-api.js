import {memberPublicId} from './public-ids.mjs';
import { NextResponse } from 'next/server.js';
import { validDate } from './members.mjs';
import { paymentAmount, PAYMENT_MODES } from './payments.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status)=>reply({error},status);
const keyValid=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(value);
export async function membershipApi(action,req,u,sql) {
 if(!['admin','manager','superadmin'].includes(u.role))return fail('Access denied',403);
 const gymId=u.role==='manager'?u.created_by:u.id,branch=u.role==='manager'?u.location_id:null;
 if(u.role==='manager'&&!branch)return fail('Assigned location required',403);
 if(req.method==='GET'){
  if(action==='memberships'){
   const rows=await sql`SELECT a.id,a.member_id,m.public_id AS member_public_id,m.name,a.plan_name,a.amount,a.paid,(a.amount-a.paid) AS due,to_char(a.valid_from,'YYYY-MM-DD') AS valid_from,to_char(a.valid_to,'YYYY-MM-DD') AS valid_to FROM membership_assignments a JOIN members m ON m.id=a.member_id WHERE a.superseded_by IS NULL AND (${u.role}='superadmin' OR a.admin_id=${gymId}) AND (${!branch} OR m.location_id=${branch}) ORDER BY a.id DESC`;
   return reply(rows.map(a=>({...a,memberId:memberPublicId(a),paymentStatus:Number(a.due)===0?'Completed':Number(a.paid)>0?'Partial':'Pending'})));
  }
  return reply(await sql`SELECT p.id,p.assignment_id,p.amount,p.method,p.reference,to_char(p.paid_on,'YYYY-MM-DD') AS paid_on,m.name,m.phone,m.id AS member_id,m.public_id AS "memberId",a.plan_name FROM membership_payments p JOIN membership_assignments a ON a.id=p.assignment_id JOIN members m ON m.id=a.member_id WHERE (${u.role}='superadmin' OR a.admin_id=${gymId}) AND (${!branch} OR m.location_id=${branch}) ORDER BY p.id DESC`);
 }
 if(req.method!=='POST')return fail('Method not allowed',405);
 if(!['admin','manager'].includes(u.role))return fail('Admin access required',403);
 const b=await req.json();
 if(!keyValid(b.requestKey))return fail('Invalid request',400);
 if(action==='memberships'){
  if(!Number.isInteger(Number(b.memberId))||Number(b.memberId)<1||!Number.isInteger(Number(b.planId))||Number(b.planId)<1||!validDate(b.validFrom)||!validDate(b.validTo)||b.validTo<b.validFrom)return fail('Enter a member, plan and valid dates',400);
  const [,addedRows]=await sql.transaction([
   sql`SELECT pg_advisory_xact_lock(7482,${Number(b.memberId)})`,
   sql`WITH selected AS (SELECT p.id,p.name,p.amount,m.id AS member_id FROM plans p JOIN members m ON m.admin_id=p.admin_id WHERE m.id=${Number(b.memberId)} AND m.admin_id=${gymId} AND (${!branch} OR m.location_id=${branch}) AND p.id=${Number(b.planId)} AND p.archived=FALSE AND p.amount IS NOT NULL AND NOT EXISTS(SELECT 1 FROM membership_assignments a WHERE a.member_id=m.id AND a.superseded_by IS NULL)), added AS (INSERT INTO membership_assignments(admin_id,member_id,plan_id,plan_name,amount,valid_from,valid_to,request_key) SELECT ${gymId},member_id,id,name,amount,${b.validFrom},${b.validTo},${b.requestKey} FROM selected ON CONFLICT DO NOTHING RETURNING *), updated AS (UPDATE members m SET plan=a.plan_name,plan_id=a.plan_id,valid_from=a.valid_from,valid_to=a.valid_to,status='Active' FROM added a WHERE m.id=a.member_id) SELECT id FROM added`
  ]);
  const [assigned]=addedRows;
  if(assigned)return reply(assigned,201);
  const [existing]=await sql`SELECT id FROM membership_assignments WHERE member_id=${Number(b.memberId)} AND admin_id=${gymId} AND (${!branch} OR EXISTS(SELECT 1 FROM members m WHERE m.id=member_id AND m.location_id=${branch})) AND superseded_by IS NULL LIMIT 1`;
  return existing?fail('This member already has a membership',409):fail('Invalid member, incomplete plan, or membership already assigned',400);
 }
 const amount=paymentAmount(b.amount);
 if(!Number.isInteger(Number(b.assignmentId))||Number(b.assignmentId)<1||!amount||!PAYMENT_MODES.includes(b.method)||!validDate(b.paidOn))return fail('Enter valid payment details',400);
 // PostgreSQL locks the assignment row while checking the remaining balance.
 const [paid]=await sql`WITH updated AS (UPDATE membership_assignments SET paid=paid+${amount}::numeric WHERE id=${Number(b.assignmentId)} AND admin_id=${gymId} AND superseded_by IS NULL AND (${!branch} OR EXISTS(SELECT 1 FROM members m WHERE m.id=membership_assignments.member_id AND m.location_id=${branch})) AND paid+${amount}::numeric<=amount AND (paid=0 OR paid+${amount}::numeric=amount) AND NOT EXISTS(SELECT 1 FROM membership_payments WHERE admin_id=${gymId} AND request_key=${b.requestKey}) RETURNING id), inserted AS (INSERT INTO membership_payments(assignment_id,admin_id,amount,method,reference,paid_on,request_key) SELECT id,${gymId},${amount}::numeric,${b.method},${''},${b.paidOn},${b.requestKey} FROM updated RETURNING id) SELECT id FROM inserted`;
 return paid?reply(paid,201):fail('After a part payment, pay the full remaining balance. Check the due amount or whether payment was already recorded',400);
}
