import test from 'node:test';import assert from 'node:assert/strict';import {registrationPayment} from '../lib/payments.mjs';import {membershipApi} from '../lib/membership-api.js';import {managerApi} from '../lib/manager-api.js';import {managerSupervisors} from '../lib/manager-supervisors.js';
const manager={id:20,role:'manager',created_by:8,location_id:3,location_name:'Dum Dum'};const req=(action,method='GET',body)=>new Request('https://test/api/'+action,{method,body:body?JSON.stringify(body):undefined});
test('full payment derives the plan price and one part payment must be below that price',()=>{assert.equal(registrationPayment('Full','2000.00','1'),'2000.00');assert.equal(registrationPayment('Part','2000.00','500.50'),'500.50');for(const amount of ['0','2000','2001','-1','1.001'])assert.equal(registrationPayment('Part','2000',amount),null);assert.equal(registrationPayment('Other','2000','500'),null);});
test('manager payment history restricts gym and location',async()=>{let called=false;const response=await membershipApi('membership-payments',req('membership-payments'),manager,async(strings,...values)=>{called=true;assert.match(strings.join('?'),/m.location_id=\?/);assert.ok(values.includes(8));assert.ok(values.includes(3));assert.ok(values.includes(false));return [];});assert.equal(response.status,200);assert.ok(called);});
test('manager cannot move another manager to a different branch',async()=>{const response=await managerApi('managers',req('managers','PATCH',{id:21,name:'Test',phone:'+919831134311',locationId:4}),manager,async()=>[{id:21,location_id:3}]);assert.equal(response.status,403);});
test('manager cannot create a supervisor in a different branch',async()=>{const response=await managerSupervisors(req('supervisors','POST',{name:'Test',locationId:4}),manager,()=>{throw Error('Unexpected query')});assert.equal(response.status,403);});
test('payment update enforces settlement after the initial partial payment atomically',async()=>{const response=await membershipApi('membership-payments',req('membership-payments','POST',{assignmentId:1,requestKey:'payment-request-123456',amount:'500',method:'Cash',paidOn:'2026-11-07'}),manager,async(strings)=>{assert.match(strings.join('?'),/paid=0 OR paid\+\?::numeric=amount/);return [];});assert.equal(response.status,400);});

 test('manager deletion needs one scoped write and refuses self-deletion',async()=>{
 let queries=0;const sql=async(strings,...values)=>{queries++;assert.match(strings.join('?'),/UPDATE users SET archived_at/);assert.match(strings.join('?'),/location_id=/);assert.ok(values.includes(8));assert.ok(values.includes(3));return [{id:21}];};
 assert.equal((await managerApi('managers',req('managers','DELETE',{id:21}),manager,sql)).status,200);assert.equal(queries,1);
 assert.equal((await managerApi('managers',req('managers','DELETE',{id:20}),manager,()=>{throw Error('Unexpected query');})).status,403);
 assert.equal((await managerApi('managers',req('managers','DELETE',{id:999}),manager,async()=>[])).status,404);
});
test('supervisor deletion uses one scoped write and returns not found outside the branch',async()=>{
 let queries=0;const sql=async(strings,...values)=>{queries++;assert.match(strings.join('?'),/role='supervisor'/);assert.match(strings.join('?'),/location_id=/);assert.deepEqual(values,[9,8,3]);return [{id:9}];};
 assert.equal((await managerSupervisors(req('supervisors','DELETE',{id:9}),manager,sql)).status,200);assert.equal(queries,1);
 assert.equal((await managerSupervisors(req('supervisors','DELETE',{id:999}),manager,async()=>[])).status,404);
});
