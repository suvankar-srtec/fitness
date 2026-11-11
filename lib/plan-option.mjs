const currency=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2});
export function planOptionLabel(plan){
 const parts=[plan.name];
 if(plan.amount!=null)parts.push(currency.format(Number(plan.amount)));
 if(Number(plan.duration_days)>0)parts.push(`${Number(plan.duration_days)} days`);
 return parts.join(' / ');
}
