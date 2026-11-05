import {memberPublicId} from './public-ids.mjs';
export function filterPayments(payments,{from='',to='',method='All'}) {
 return payments.filter(p=>(!from||p.paid_on>=from)&&(!to||p.paid_on<=to)&&(method==='All'||p.method===method));
}
export function totalPayments(payments) {
 const cents=payments.reduce((sum,p)=>{const [whole,fraction='']=String(p.amount).split('.');return sum+BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));},0n);
 return `${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
}
export function paymentReportCsv(payments) {
 const cell=value=>{let text=String(value??'');if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 const rows=[['Receipt','Registration No','Name','Amount (INR)','Payment Date','Transaction Type','Dr/Cr','Payment Method','Membership','Details'],...payments.map(p=>['PAY'+String(p.id).padStart(5,'0'),memberPublicId(p),p.name,p.amount,p.paid_on,'Membership fee','Cr',p.method,p.plan_name,p.reference])];
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
