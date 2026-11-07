import {gatePassStatus} from './gate-pass.mjs';
export function adminMemberAnalytics(members,today){
 const [year,month]=today.slice(0,7).split('-').map(Number);
 const months=Array.from({length:6},(_,i)=>{const date=new Date(Date.UTC(year,month-6+i,1)),key=date.toISOString().slice(0,7);return {key,label:new Intl.DateTimeFormat('en-GB',{month:'short',timeZone:'UTC'}).format(date),count:members.filter(m=>String(m.joined).slice(0,7)===key).length};});
 const active=members.filter(m=>gatePassStatus(m,today)==='Active').length;
 const plans=new Map();for(const m of members){const key=m.plan||'Unassigned';plans.set(key,(plans.get(key)||0)+1);}
 return {total:members.length,active,other:members.length-active,months,plans:[...plans].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)};
}
