import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceApi} from '../lib/workspace-api.js';
const request=(method='GET')=>new Request('https://gym.test/api/workspace',{method});
test('workspace denies unsupported roles, writes and unassigned managers before reading',async()=>{
 const sql=()=>{throw Error('Unexpected query');};
 for(const role of ['member','supervisor'])assert.equal((await workspaceApi(request(),{role},sql)).status,403);
 assert.equal((await workspaceApi(request(),{role:'manager',created_by:8},sql)).status,403);
 assert.equal((await workspaceApi(request('POST'),{id:8,role:'admin'},sql)).status,405);
});
test('manager workspace reads all lists in one query scoped to organization and location',async()=>{
 let queries=0;
 const sql=async(strings,...values)=>{
  queries++;const query=strings.join('?');assert.match(query,/m.admin_id=/);assert.match(query,/m.location_id=/);assert.match(query,/u.created_by=/);assert.match(query,/u.location_id=/);assert.match(query,/p.admin_id=/);assert.match(query,/-'password'-'password_ready'/);assert.ok(values.includes(8));assert.ok(values.includes(3));assert.equal(values.includes(true),false);
  return [{members:[],accounts:[],plans:[]}];
 };
 const response=await workspaceApi(request(),{id:20,role:'manager',created_by:8,location_id:3},sql);
 assert.equal(queries,1);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('server-timing'),/workspace;dur=/);
 assert.deepEqual(await response.json(),{members:[],plans:[],admins:[],superadmins:[],managers:[],supervisors:[]});
});
test('workspace preserves directory details and strips credentials from responses',async()=>{
 const response=await workspaceApi(request(),{id:8,role:'admin'},async()=>[{
  members:[{id:1,public_id:'ME-FIDU-01',name:'Member',plan:'Legacy',plan_name:'Gold',phone:'+919831134311',email:'member@example.com',locationName:'Dum Dum',valid_from:'2026-01-01',valid_to:'2027-01-01',has_picture:true,password:'SECRET',password_ready:true}],
  accounts:[{id:2,role:'supervisor',public_id:'EM-FIDU-01',created_by:8,location_id:3,location_name:'Dum Dum',resolved_gym_name:'Organization',employee_role_name:'Trainer',password:'SECRET'}],plans:[{id:1,name:'Gold',amount:1000}]
 }]);
 const data=await response.json();assert.equal(data.members[0].memberId,'ME-FIDU-01');assert.equal(data.members[0].plan,'Gold');assert.equal(data.members[0].profilePictureUrl,'/api/member-photo?id=1');assert.equal(data.supervisors[0].employeeRoleName,'Trainer');assert.equal(JSON.stringify(data).includes('SECRET'),false);assert.equal('password_ready' in data.members[0],false);
});
