import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSubscription,subscriptionError} from '../lib/gym-subscription.mjs';
test('legacy gyms and blank limits are unlimited without an expiry',()=>{assert.deepEqual(normalizeSubscription({}),{validFrom:null,validUntil:null,memberLimit:null,managerLimit:null,supervisorLimit:null,branchLimit:null});});
test('zero prevents creation and each gym capacity is parsed independently',()=>{const plan=normalizeSubscription({memberLimit:'25',managerLimit:'2',supervisorLimit:'0',branchLimit:'1',subscriptionFrom:'2026-11-13',subscriptionUntil:'2027-11-12'});assert.equal(plan.memberLimit,25);assert.equal(plan.supervisorLimit,0);assert.equal(plan.validUntil,'2027-11-12');});
test('reject invalid dates and reversed validity',()=>{for(const input of [{subscriptionFrom:'2026-02-30'},{subscriptionUntil:'invalid'},{subscriptionFrom:'2027-01-01',subscriptionUntil:'2026-12-31'}])assert.throws(()=>normalizeSubscription(input));});
test('reject negative, fractional, unsafe and malformed capacities',()=>{for(const value of ['-1','1.5','NaN',Infinity,'99999999999999999999','1e3'])assert.throws(()=>normalizeSubscription({memberLimit:value}));});
test('database capacity errors produce actionable messages',()=>{assert.match(subscriptionError(new Error('GYM_MEMBER_LIMIT')),/member limit/);assert.match(subscriptionError(new Error('GYM_SUBSCRIPTION_INACTIVE')),/subscription/);assert.equal(subscriptionError(new Error('other')),null);});
