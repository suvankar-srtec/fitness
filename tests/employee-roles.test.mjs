import test from 'node:test';
import assert from 'node:assert/strict';
import {employeeRolesApi,resolveEmployeeRole} from '../lib/employee-roles-api.js';
const req=(method='GET',body,query='')=>new Request('https://gym.test/api/employee-roles'+query,{method,body:body?JSON.stringify(body):undefined});
test('role creation is scoped to the authenticated organization and saves access',async()=>{
 const sql=async(strings,...values)=>{assert.match(strings.join('?'),/ON CONFLICT/);assert.deepEqual(values,[8,'Trainer','supervisor']);return [{id:5,name:'Trainer',baseRole:'supervisor'}];};
 const response=await employeeRolesApi(req('POST',{name:' Trainer ',baseRole:'supervisor',adminId:999}),{id:20,role:'manager',created_by:8,location_id:3},sql);
 assert.equal(response.status,201);assert.equal((await response.json()).name,'Trainer');
});
test('role reads cannot switch a manager to another organization',async()=>{
 const sql=async(strings,...values)=>{assert.deepEqual(values,[8]);return [];};
 assert.equal((await employeeRolesApi(req('GET',undefined,'?adminId=999'),{role:'manager',created_by:8,location_id:3},sql)).status,200);
});
test('invalid, reserved and duplicate role names are rejected',async()=>{
 for(const name of ['','Manager','Supervisor','x'.repeat(61)])assert.equal((await employeeRolesApi(req('POST',{name,baseRole:'supervisor'}),{id:8,role:'admin'},()=>{throw Error('Unexpected query');})).status,400);
 assert.equal((await employeeRolesApi(req('POST',{name:'Trainer',baseRole:'supervisor'}),{id:8,role:'admin'},async()=>[])).status,409);
 for(const role of ['member','supervisor'])assert.equal((await employeeRolesApi(req(),{role},()=>{throw Error('Unexpected query');})).status,403);
});
test('assignment resolves stored permissions and rejects roles from another organization',async()=>{
 const sql=async(strings,...values)=>{assert.deepEqual(values,[5,8]);return [{id:5,name:'Trainer',base_role:'supervisor'}];};
 assert.deepEqual(await resolveEmployeeRole(sql,8,{employeeRoleId:5,role:'manager'}),{role:'supervisor',employeeRoleId:5,name:'Trainer'});
 assert.equal(await resolveEmployeeRole(async()=>[],8,{employeeRoleId:99}),null);
});
