import {addonPrice} from './membership-addons.mjs';
import {registrationPayment} from './payments.mjs';

export async function registrationCharge(sql,gymId,planId,body){
 const addonName=typeof body.addonName==='string'?body.addonName.trim():'';
 if((body.addonName!==undefined&&typeof body.addonName!=='string')||addonName.length>80)return {error:'Select a valid add-on'};
 const addonAmount=addonName?addonPrice(body.addonAmount):'0.00';
 if(addonName&&!addonAmount)return {error:'Save the add-on amount before payment'};
 const [plan]=await sql`SELECT p.amount,p.duration_days,extra.amount AS addon_amount FROM plans p LEFT JOIN gym_membership_addons extra ON extra.admin_id=p.admin_id AND lower(extra.name)=lower(${addonName}) WHERE p.id=${planId} AND p.admin_id=${gymId} AND p.archived=FALSE`;
 if(!plan||plan.amount==null)return {error:'Select an available plan'};
 if(addonName&&(plan.addon_amount==null||addonPrice(plan.addon_amount)!==addonAmount))return {error:'The add-on price changed. Select it again before payment'};
 const total=(Number(plan.amount)+Number(addonName?plan.addon_amount:0)).toFixed(2);
 const paymentType=body.paymentType||'Full',initialPaid=registrationPayment(paymentType,total,body.paymentAmount);
 if(initialPaid===null)return {error:'Enter a valid full or part payment'};
 return {paymentType,initialPaid,addonName,addonAmount,planAmount:plan.amount,durationDays:plan.duration_days};
}

export async function createRegisteredMember(sql,{gymId,m,location,picture,b,token,paymentType,initialPaid,addonName,addonAmount,planAmount}){
 const [created]=await sql`WITH priced AS MATERIALIZED (SELECT p.id,p.name,p.amount+COALESCE(extra.amount,0) AS amount,COALESCE(extra.name,'') AS addon_name,COALESCE(extra.amount,0) AS addon_amount FROM plans p LEFT JOIN gym_membership_addons extra ON extra.admin_id=p.admin_id AND lower(extra.name)=lower(${addonName}) WHERE p.id=${m.planId} AND p.admin_id=${gymId} AND p.archived=FALSE AND p.amount IS NOT NULL AND p.amount=${planAmount}::numeric AND (${addonName}='' OR extra.amount=${addonAmount}::numeric)), reserved AS (DELETE FROM member_registrations WHERE token_hash=${token} AND admin_id=${gymId} AND expires_at>NOW() AND EXISTS(SELECT 1 FROM priced) RETURNING member_id,public_id), added AS (INSERT INTO members(id,public_id,admin_id,location_id,name,phone,email,plan,plan_id,gender,age,dob,address,height_ft,weight_kg,interested_area,status,valid_from,valid_to,group_name) SELECT reserved.member_id,reserved.public_id,${gymId},${location.id},${m.name},${m.phone},${m.email},p.name,p.id,${m.gender},${m.age},${m.dob},${m.address},${m.height},${m.weight},${m.interestedArea},${m.status},${m.validFrom},${m.validTo},${m.groupName} FROM priced p CROSS JOIN reserved RETURNING id,public_id), saved_picture AS (INSERT INTO member_pictures(member_id,data) SELECT id,${picture}::text FROM added WHERE ${picture}::text IS NOT NULL), initial_membership AS (INSERT INTO membership_assignments(admin_id,member_id,plan_id,plan_name,amount,paid,valid_from,valid_to,request_key,addon_name,addon_amount) SELECT ${gymId},a.id,p.id,p.name,p.amount,CASE WHEN ${paymentType}='Full' THEN p.amount ELSE ${initialPaid}::numeric END,${m.validFrom},${m.validTo},'registration-'||a.id,p.addon_name,p.addon_amount FROM added a CROSS JOIN priced p RETURNING id,amount,paid), initial_payment AS (INSERT INTO membership_payments(assignment_id,admin_id,amount,method,reference,paid_on,request_key) SELECT id,${gymId},paid,${b.paymentMode},'',(NOW() AT TIME ZONE 'Asia/Kolkata')::date,'registration-'||id FROM initial_membership WHERE paid>0) SELECT id,public_id FROM added`;
 return created;
}
