export function validatePlan(data) {
 if(typeof data.name!=='string'||!data.name.trim()||data.name.trim().length>100)return {error:'Enter a plan name'};
 const duration=Number(data.durationDays);
 if(!String(data.durationDays??'').trim()||!Number.isInteger(duration)||duration<1||duration>36500)return {error:'Enter a valid duration in days'};
 const amount=String(data.amount??'').trim();
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(amount))return {error:'Enter a valid amount'};
 if(typeof data.description!=='string'||data.description.length>1000)return {error:'Description must be at most 1000 characters'};
 return {name:data.name.trim(),durationDays:duration,amount,description:data.description.trim()};
}
