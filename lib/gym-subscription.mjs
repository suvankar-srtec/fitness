export const capacityFields = [['memberLimit','Active member limit'],['managerLimit','Manager limit'],['supervisorLimit','Employee limit'],['branchLimit','Branch limit']];
export function normalizeSubscription(input) {
 const date = key => {const value=input[key]||null;if(value!==null && (typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value))throw new Error('Enter a valid subscription date');return value;};
 const result={validFrom:date('subscriptionFrom'),validUntil:date('subscriptionUntil')};
 if(result.validFrom&&result.validUntil&&result.validUntil<result.validFrom)throw new Error('Subscription end date must follow the start date');
 for(const [key] of capacityFields){const value=input[key];if(value===undefined||value===null||value===''){result[key]=null;continue;}if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)>10000000)throw new Error('Limits must be whole numbers between 0 and 10000000');result[key]=Number(value);}
 return result;
}
export function subscriptionError(error){
 const messages={GYM_SUBSCRIPTION_INACTIVE:'Organization subscription is not active. Contact superadmin.',GYM_MEMBER_LIMIT:'This organization has reached its active member limit. Contact superadmin.',GYM_MANAGER_LIMIT:'This organization has reached its manager limit. Contact superadmin.',GYM_SUPERVISOR_LIMIT:'This organization has reached its employee limit. Contact superadmin.',GYM_BRANCH_LIMIT:'This organization has reached its branch limit. Contact superadmin.',GYM_LIMIT_BELOW_USAGE:'A limit cannot be lower than the current organization usage.'};
 return messages[error.message]||null;
}
