import {memberPublicId} from './public-ids.mjs';
export function paymentNotifications(memberships,payments) {
 const notices=memberships.filter(m=>Number(m.due)>0).map(m=>({id:'due-'+m.id,type:'due',title:Number(m.paid)>0?'Partial payment':'Payment pending',name:m.name,memberId:m.memberId,plan:m.plan_name,amount:m.due,date:m.valid_from,assignmentId:m.id}));
 for(const payment of payments)notices.push({id:'payment-'+payment.id,type:'received',title:'Payment received',name:payment.name,memberId:memberPublicId(payment),plan:payment.plan_name,amount:payment.amount,date:payment.paid_on,method:payment.method,receipt:'PAY'+String(payment.id).padStart(5,'0'),assignmentId:payment.assignment_id});
 return notices.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id,undefined,{numeric:true}));
}
