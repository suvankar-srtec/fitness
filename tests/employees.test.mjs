import test from 'node:test';
import assert from 'node:assert/strict';
import {employeesApi} from '../lib/employees-api.js';
const req=(method,body)=>new Request('https://gym.test/api/employees',{method,body:JSON.stringify(body)});
const manager={id:20,role:'manager',created_by:8,location_id:3,location_name:'Dum Dum'};
const details={name:'Employee',phone:'+919831134311',email:'employee@example.com',role:'supervisor',locationId:3};
test('employee creation rejects unauthorized roles and out-of-branch assignments',async()=>{
 const noQuery=()=>{throw Error('Unexpected query');};
 assert.equal((await employeesApi(req('POST',details),{role:'member'},noQuery)).status,403);
 assert.equal((await employeesApi(req('POST',{...details,locationId:4}),manager,noQuery)).status,403);
 assert.equal((await employeesApi(req('POST',{...details,role:'admin'}),{id:8,role:'admin'},noQuery)).status,400);
});
test('manager cannot move employees to another location',async()=>{
 const sql=async()=>[{id:9,role:'supervisor',created_by:8,location_id:3}];
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

test('assigned managers can create either employee role within their own branch',async()=>{
 for(const role of ['manager','supervisor']){
  const sql=async(strings,...values)=>{
   if(strings.join('?').includes('FROM gym_locations'))return [{id:3,name:'Dum Dum',admin_id:8}];
   assert.ok(values.includes(role));assert.equal(values.at(-1),role==='supervisor'?20:null);
   return [{id:9,public_id:'EMP-FITFUSION-DUMDUM-00009',role,created_by:8,location_id:3}];
  };
  const response=await employeesApi(req('POST',{...details,role}),manager,sql);
  assert.equal(response.status,201);assert.equal((await response.json()).role,role);
 }
});
test('assigned managers can change another employee role and keep branch scoping',async()=>{
 for(const [before,after] of [['supervisor','manager'],['manager','supervisor']]){
  let step=0;
  const sql=async(strings,...values)=>{
   const query=strings.join('?');
   if(step++===0){assert.match(query,/location_id=/);assert.ok(values.includes(3));assert.ok(values.includes(8));return [{id:9,role:before,created_by:8,location_id:3}];}
   if(query.includes('FROM gym_locations'))return [{id:3,name:'Dum Dum',admin_id:8}];
   assert.match(query,/DELETE FROM sessions/);assert.ok(values.includes(after));
   return [{id:9,role:after,created_by:8,location_id:3}];
  };
  const response=await employeesApi(req('PATCH',{...details,id:9,role:after}),manager,sql);
  assert.equal(response.status,200);assert.equal((await response.json()).role,after);
 }
});
test('employees cannot change their own role or edit an out-of-scope account',async()=>{
 assert.equal((await employeesApi(req('PATCH',{...details,id:20}),manager,async()=>[{id:20,role:'manager',created_by:8,location_id:3}])).status,403);
 assert.equal((await employeesApi(req('PATCH',{...details,id:99}),manager,async()=>[])).status,404);
});

test('custom employee roles use stored access rather than a forged client role',async()=>{
 const sql=async(strings,...values)=>{
  const query=strings.join('?');
  if(query.includes('FROM employee_roles')){assert.deepEqual(values,[5,8]);return [{id:5,name:'Trainer',base_role:'supervisor'}];}
  if(query.includes('FROM gym_locations'))return [{id:3,name:'Dum Dum',admin_id:8}];
  assert.ok(values.includes('supervisor'));assert.equal(values.includes('manager'),false);assert.ok(values.includes(5));
  return [{id:9,role:'supervisor',employee_role_id:5,public_id:'EMP-FITFUSION-DUMDUM-00009',created_by:8,location_id:3}];
 };
 const response=await employeesApi(req('POST',{...details,role:'manager',employeeRoleId:5}),manager,sql);
 assert.equal(response.status,201);const person=await response.json();assert.equal(person.role,'supervisor');assert.equal(person.employeeRoleName,'Trainer');assert.equal(person.employeeRoleId,5);
});
test('roles belonging to another organization cannot be assigned',async()=>{
 assert.equal((await employeesApi(req('POST',{...details,employeeRoleId:99}),manager,async()=>[])).status,400);
});
