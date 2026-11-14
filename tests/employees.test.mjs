import test from 'node:test';
import assert from 'node:assert/strict';
import {employeesApi} from '../lib/employees-api.js';
const req=(method,body)=>new Request('https://gym.test/api/employees',{method,body:JSON.stringify(body)});
const manager={id:20,role:'manager',created_by:8,location_id:3,location_name:'Dum Dum'};
const details={name:'Employee',phone:'+919831134311',email:'employee@example.com',role:'supervisor',locationId:3};
test('employee creation rejects unauthorized roles and manager privilege escalation before writing',async()=>{
 const noQuery=()=>{throw Error('Unexpected query');};
 assert.equal((await employeesApi(req('POST',details),{role:'member'},noQuery)).status,403);
 assert.equal((await employeesApi(req('POST',{...details,role:'manager'}),manager,noQuery)).status,403);
 assert.equal((await employeesApi(req('POST',{...details,locationId:4}),manager,noQuery)).status,403);
 assert.equal((await employeesApi(req('POST',{...details,role:'admin'}),{id:8,role:'admin'},noQuery)).status,400);
});
test('manager cannot promote an existing supervisor or move them to another location',async()=>{
 const sql=async()=>[{id:9,role:'supervisor',created_by:8,location_id:3}];
 assert.equal((await employeesApi(req('PATCH',{...details,id:9,role:'manager'}),manager,sql)).status,403);
 assert.equal((await employeesApi(req('PATCH',{...details,id:9,locationId:4}),manager,sql)).status,403);
});
test('admin role changes preserve IDs and revoke sessions atomically',async()=>{
 let step=0;
 const sql=async(strings,...values)=>{
  const query=strings.join('?');
  if(step++===0)return [{id:9,public_id:'sup01',role:'supervisor',created_by:8,location_id:3}];
  if(query.includes('FROM gym_locations'))return [{id:3,name:'Dum Dum',admin_id:8}];
  assert.match(query,/WITH updated AS/);assert.match(query,/DELETE FROM sessions/);assert.match(query,/EXISTS\(SELECT 1 FROM updated\)/);assert.doesNotMatch(query,/SET public_id/);assert.ok(values.includes('manager'));
  return [{id:9,public_id:'sup01',role:'manager',created_by:8,location_id:3}];
 };
 const response=await employeesApi(req('PATCH',{...details,id:9,role:'manager'}),{id:8,role:'admin',gym_name:'Fit Fusion'},sql);
 assert.equal(response.status,200);const employee=await response.json();assert.equal(employee.role,'manager');assert.equal(employee.userType,'EMP');assert.equal(employee.userId,'sup01');
});
test('employee creation uses the selected role and server-generated ID',async()=>{
 const sql=async(strings,...values)=>{
  if(strings.join('?').includes('FROM gym_locations'))return [{id:3,name:'Dum Dum',admin_id:8}];
  assert.match(strings.join('?'),/INSERT INTO users\(name,password,role/);assert.ok(values.includes('manager'));
  return [{id:9,public_id:'EMP-FITFUSION-DUMDUM-00001',role:'manager',created_by:8,location_id:3}];
 };
 const response=await employeesApi(req('POST',{...details,role:'manager',public_id:'forged'}),{id:8,role:'admin',gym_name:'Fit Fusion'},sql);
 assert.equal(response.status,201);assert.equal((await response.json()).userId,'EMP-FITFUSION-DUMDUM-00001');
});
