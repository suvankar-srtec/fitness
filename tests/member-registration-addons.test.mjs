import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationCharge} from '../lib/member-registration-payment.mjs';
import {paymentBillHtml} from '../lib/payment-bill.mjs';
const catalog=()=>[{amount:'2000.00',addon_amount:'500.00'}];
const body={addonName:'Locker Rental',addonAmount:'500.00'};
test('new member full payment includes the gym add-on once and ignores client full-payment amount',async()=>{
 const charge=await registrationCharge(catalog,17,9,{...body,paymentType:'Full',paymentAmount:1});
 assert.equal(charge.initialPaid,'2500.00');assert.equal(charge.planAmount,'2000.00');assert.equal(charge.addonAmount,'500.00');
});
test('new member part payment can include the add-on but must remain below the combined total',async()=>{
 assert.equal((await registrationCharge(catalog,17,9,{...body,paymentType:'Part',paymentAmount:'2200'})).initialPaid,'2200');
 for(const paymentAmount of ['0','2500','2501','-1','100.001'])assert.ok((await registrationCharge(catalog,17,9,{...body,paymentType:'Part',paymentAmount})).error);
});
test('missing, unsaved and stale add-on prices cannot be charged',async()=>{
 for(const b of [{...body,addonAmount:undefined},{...body,addonAmount:'1'},{...body,addonAmount:'-1'},{...body,addonName:42}])assert.ok((await registrationCharge(catalog,17,9,b)).error);
 assert.ok((await registrationCharge(()=>[{amount:'2000',addon_amount:null}],17,9,body)).error);
});
test('registration without an add-on retains the plan-only payment behavior',async()=>{
 const charge=await registrationCharge(()=>[{amount:'2000.00'}],17,9,{paymentType:'Full',addonAmount:999});
 assert.equal(charge.initialPaid,'2000.00');assert.equal(charge.addonName,'');assert.equal(charge.addonAmount,'0.00');
});
test('registration bills itemize purchased add-ons without increasing the payment received',()=>{
 const html=paymentBillHtml({member:{name:'Test'},gym:{name:'Gym'},memberships:[{id:2,amount:'2500',addon_name:'Locker Rental',addon_amount:'500',due:0}],payments:[{id:7,assignment_id:2,plan_name:'Gold',amount:'2500',method:'Cash',paid_on:'2026-11-11'}]},'membership-7');
 assert.match(html,/Locker Rental/);assert.match(html,/2,000.00/);assert.match(html,/500.00/);assert.match(html,/2,500.00/);
});
