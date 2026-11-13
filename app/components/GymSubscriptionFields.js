"use client";
import {capacityFields} from '../../lib/gym-subscription.mjs';
export default function GymSubscriptionFields({plan={}}){
 const keys={memberLimit:'member_limit',managerLimit:'manager_limit',supervisorLimit:'supervisor_limit',branchLimit:'branch_limit'};
 const usage={memberLimit:'members_used',managerLimit:'managers_used',supervisorLimit:'supervisors_used',branchLimit:'branches_used'};
 return <div className="subscription-grid"><input type="hidden" name="subscriptionConfigured" value="1"/><div><label htmlFor="subscriptionFrom">Valid from</label><input id="subscriptionFrom" name="subscriptionFrom" type="date" defaultValue={plan.valid_from||''}/></div><div><label htmlFor="subscriptionUntil">Valid until</label><input id="subscriptionUntil" name="subscriptionUntil" type="date" defaultValue={plan.valid_until||''}/></div>{capacityFields.map(([key,label])=><div key={key}><label htmlFor={key}>{label}</label><input id={key} name={key} type="number" min="0" max="10000000" step="1" placeholder="Unlimited" defaultValue={plan[keys[key]]??''}/>{plan[usage[key]]!==undefined&&<small>{plan[usage[key]]} used</small>}</div>)}<p className="subscription-hint">Leave limits blank for Unlimited. Limits count saved, non-archived accounts across all gym locations.</p></div>;
}
