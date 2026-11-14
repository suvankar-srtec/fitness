import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {employeesApi} from '../lib/employees-api.js';
import {employeeRolesApi} from '../lib/employee-roles-api.js';
import {employeeDetails} from '../lib/employee-details.js';
import {subscriptionError} from '../lib/gym-subscription.mjs';
import {normalizeEmail} from '../lib/email-otp.mjs';
const require=createRequire(import.meta.url),parser=require('next/dist/compiled/babel/parser');
const source=readFileSync(new URL('../app/api/[action]/route.js',import.meta.url),'utf8');
const ast=parser.parse(source,{sourceType:'module'}),node=ast.program.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='handle');
// Execute the actual route handler, replacing only its environment and authenticated DB transport.
function handler(sql){
 const response=(body,status=200)=>Response.json(body,{status});
 return runInNewContext(source.slice(node.start,node.end)+';handle',{
  response,fail:(error,status)=>response({error},status),database:()=>sql,sameRequestOrigin:()=>true,
  normalizeEmail,tokenHash:()=>'',withAuditActor:sql=>sql,subscriptionError,employeesApi,employeeRolesApi,employeeDetails,
  console:{error(){}},URL,SyntaxError,Error
 });
}
const user={id:20,role:'manager',created_by:8,location_id:3,location_name:'Dum Dum',gym_name:'Fit Fusion',account_enabled:true,subscription_active:true,password_ready:true};
function request(body){const req=new Request('https://gym.test/api/employees',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});req.cookies={get:()=>({value:'session-token'})};return req;}
const body={name:'Employee',phone:'+919831134311',country:'IN',role:'manager',email:'',locationId:3};
test('employee capacity errors cross the real API boundary as JSON 409',async()=>{
 let writes=0;
 const sql=async(strings)=>{
  const query=strings.join('?');
  if(query.includes('JOIN sessions'))return [user];
  if(query.includes('FROM gym_locations'))return [{id:3,name:'Dum Dum',admin_id:8}];
  writes++;throw Error('GYM_MANAGER_LIMIT');
 };
 const response=await handler(sql)(request(body),{params:Promise.resolve({action:'employees'})});
 assert.equal(response.status,409);assert.match(response.headers.get('content-type'),/json/);assert.match((await response.json()).error,/manager limit/);assert.equal(writes,1);
});
test('duplicate phone errors become JSON 409 rather than an empty server response',async()=>{
 const sql=async(strings)=>{
  const query=strings.join('?');if(query.includes('JOIN sessions'))return [user];if(query.includes('FROM gym_locations'))return [{id:3,name:'Dum Dum',admin_id:8}];throw Error('PHONE_IN_USE');
 };
 const response=await handler(sql)(request(body),{params:{action:'employees'}});
 assert.equal(response.status,409);assert.match((await response.json()).error,/phone number.*registered/);
});
test('employee role and detail read failures are caught by the API error boundary',async()=>{
 for(const action of ['employee-roles','employee-details']){
  const sql=async(strings)=>{if(strings.join('?').includes('JOIN sessions'))return [user];throw Error('unavailable');};
  const req=new Request('https://gym.test/api/'+action+'?id=9');req.cookies={get:()=>({value:'session-token'})};
  const response=await handler(sql)(req,{params:{action}});
  assert.equal(response.status,503);assert.equal((await response.json()).error,'Unable to load data. Please retry.');
 }
});

test('successful employee creation returns JSON through the route and client',async()=>{
 const {requestApi}=await import('../lib/api-client.mjs');
 const sql=async(strings)=>{
  const query=strings.join('?');if(query.includes('JOIN sessions'))return [user];if(query.includes('FROM gym_locations'))return [{id:3,name:'Dum Dum',admin_id:8}];
  return [{id:99,public_id:'EMP-FITFUSION-DUMDUM-00099',name:'Employee',role:'manager',created_by:8,location_id:3}];
 };
 const result=await requestApi('employees','POST',body,{fetcher:()=>handler(sql)(request(body),{params:{action:'employees'}})});
 assert.equal(result.userId,'EMP-FITFUSION-DUMDUM-00099');assert.equal(result.role,'manager');
});
