import test from 'node:test';import assert from 'node:assert/strict';
import {renewalDates,monthlyRenewalDates} from '../lib/advance-renewal.mjs';import {advanceRenewal} from '../lib/advance-renewal-api.js';
const request=body=>new Request('https://gym.test/api/membership-renew',{method:'POST',body:JSON.stringify(body)});
const body={memberId:42,planId:9,months:3,kind:'Renew',trainer:false,method:'Cash',requestKey:'renew-request-123456'};
test('advance renewal starts after existing expiry and preserves a full purchased term',()=>{assert.deepEqual(renewalDates('2026-12-05',30,'2026-11-09'),{from:'2026-12-06',to:'2027-01-04'});assert.deepEqual(renewalDates('2026-11-01',30,'2026-11-09'),{from:'2026-11-09',to:'2026-12-08'});assert.deepEqual(renewalDates('2028-02-28',2,'2028-02-01'),{from:'2028-02-29',to:'2028-03-01'});assert.equal(renewalDates('2026-12-05',0),null);});
test('member cannot record an advance renewal and unassigned manager is blocked',async()=>{const sql=()=>{throw Error('Unexpected query');};assert.equal((await advanceRenewal(request(body),{role:'member'},sql)).status,403);assert.equal((await advanceRenewal(request(body),{role:'manager'},sql)).status,403);assert.equal((await advanceRenewal(request({...body,method:'Card'}),{role:'admin',id:7},sql)).status,400);});
test('advance renewal is atomic, scoped and uses server plan prices',async()=>{const calls=[];const sql=(strings,...values)=>{calls.push({text:strings.join('?'),values});return Promise.resolve(calls.length===1?[]:[{id:5}]);};sql.transaction=queries=>Promise.all(queries);const r=await advanceRenewal(request({...body,amount:1}),{role:'manager',created_by:7,location_id:3},sql);assert.equal(r.status,201);assert.match(calls[1].text,/FOR UPDATE OF m/);assert.match(calls[1].text,/make_interval/);assert.match(calls[1].text,/p.amount\*\?/);assert.match(calls[1].text,/trainer_included/);assert.match(calls[1].text,/p.admin_id=m.admin_id/);assert.match(calls[1].text,/p.amount>=COALESCE/);assert.match(calls[1].text,/INSERT INTO membership_payments/);assert.match(calls[1].text,/request_key/);assert.ok(calls[1].values.includes(3));assert.ok(calls[1].values.includes(7));assert.match(calls[1].text,/m\.archived_at IS NULL/);});

test('renewal month dates keep calendar months, handle month ends and expired memberships',()=>{
 assert.deepEqual(monthlyRenewalDates('2026-11-09',3,'2026-11-10'),{from:'2026-11-10',to:'2027-02-09'});
 assert.deepEqual(monthlyRenewalDates('2026-12-30',6,'2026-11-10'),{from:'2026-12-31',to:'2027-06-29'});
 assert.deepEqual(monthlyRenewalDates('2028-02-28',12,'2028-02-01'),{from:'2028-02-29',to:'2029-02-27'});
 assert.equal(monthlyRenewalDates('',1,'2026-11-10'),null);
});
test('invalid renewal inputs are rejected before any database query',async()=>{
 for(const change of [{months:1},{months:0},{months:24},{planId:0},{kind:'Other'},{trainer:'yes'}]){
  const r=await advanceRenewal(request({...body,...change}),{id:7,role:'admin'},()=>{throw Error('Unexpected SQL');});assert.equal(r.status,400);
 }
});
test('unavailable or foreign member/plan produces no successful payment',async()=>{
 const sql=()=>Promise.resolve([]);sql.transaction=queries=>Promise.all(queries);
 assert.equal((await advanceRenewal(request(body),{id:7,role:'admin'},sql)).status,409);
});

test('renewals allow one initial part payment, save the due and reject invalid part amounts',async()=>{
 for(const amount of ['0','-1','bad','1.001']){const r=await advanceRenewal(request({...body,paymentType:'Part',amount}),{id:7,role:'admin'},()=>{throw Error('Unexpected SQL');});assert.equal(r.status,400);}
 const calls=[];const sql=(strings,...values)=>{calls.push({text:strings.join('?'),values});return Promise.resolve(calls.length===1?[]:[{id:5}]);};sql.transaction=q=>Promise.all(q);
 const r=await advanceRenewal(request({...body,paymentType:'Part',amount:'500'}),{id:7,role:'admin'},sql);assert.equal(r.status,201);assert.match(calls[1].text,/amount,initial_paid,starts/);assert.match(calls[1].text,/initial_paid<amount/);assert.match(calls[1].text,/SELECT a.id,\?,a.paid/);assert.ok(calls[1].values.includes('500'));
});
