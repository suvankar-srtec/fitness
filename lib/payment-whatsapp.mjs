/** Sends only for a committed, positive payment. Existing message request keys prevent duplicate sends. */
export async function sendPaymentPass(sql,user,{paymentId=null,memberId=null},send){
 const [payment]=await sql`SELECT p.id,a.member_id FROM membership_payments p JOIN membership_assignments a ON a.id=p.assignment_id JOIN members m ON m.id=a.member_id WHERE p.amount>0 AND (${paymentId!==null} AND p.id=${paymentId} OR ${memberId!==null} AND m.id=${memberId}) AND a.admin_id=${user.role==='manager'?user.created_by:user.id} AND (${user.role!=='manager'} OR m.location_id=${user.location_id||null}) ORDER BY p.id DESC LIMIT 1`;
 if(!payment)return false;
 const deliver=send||((...args)=>import('./gate-pass-api.js').then(module=>module.gatePassApi(...args)));
 const response=await deliver('whatsapp-gate-pass',new Request('https://internal.invalid/api/whatsapp-gate-pass',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:payment.member_id,requestKey:'automatic-payment-'+payment.id,...(memberId!==null?{welcome:true}:{})})}),user,sql);
 if(!response.ok)throw new Error('PAYMENT_WHATSAPP_DELIVERY_FAILED');
 return true;
}
