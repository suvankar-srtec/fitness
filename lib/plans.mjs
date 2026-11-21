export const PLAN_CATEGORIES=['Gym','Yoga'];
export function normalizePlanCategory(value){if(typeof value!=='string'||/[\u0000-\u001f\u007f]/.test(value))return null;const name=value.trim().replace(/\s+/g,' ');if(!name||name.length>60)return null;return PLAN_CATEGORIES.find(c=>c.toLowerCase()===name.toLowerCase())||name;}
export const planCategory=plan=>normalizePlanCategory(plan?.category)||'Gym';
export function planCategories(plans=[],extra=[]){const unique=new Map();for(const name of [...PLAN_CATEGORIES,...plans.map(planCategory),...extra]){const category=normalizePlanCategory(name);if(category&&!unique.has(category.toLowerCase()))unique.set(category.toLowerCase(),category);}return [...unique.values()];}
export function validatePlan(data) {
 if(typeof data.name!=='string'||!data.name.trim()||data.name.trim().length>100)return {error:'Enter a plan name'};
 const category=normalizePlanCategory(data.category??'Gym');if(!category)return {error:'Enter a package name of 1 to 60 characters'};
 const duration=Number(data.durationDays);
 if(!String(data.durationDays??'').trim()||!Number.isInteger(duration)||duration<1||duration>36500)return {error:'Enter a valid duration in days'};
 const amount=String(data.amount??'').trim();
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(amount))return {error:'Enter a valid amount'};
 if(typeof data.description!=='string'||data.description.length>1000)return {error:'Description must be at most 1000 characters'};
 return {name:data.name.trim(),durationDays:duration,amount,description:data.description.trim(),category};
}
