import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {sessionReadApi} from '../lib/session-read-api.js';
import {memberSession} from '../lib/member-auth.js';
import {loginRoute} from '../lib/login-route.js';
import {hashPassword,tokenHash} from '../lib/password.mjs';

const staff={id:8,public_id:'admin-test',role:'admin',name:'Admin',account_enabled:true,password_ready:true,subscription_active:true,password:'PRIVATE',gym_name:'Test Organization'};
const member={id:21,public_id:'ME-TEST-01',name:'Member',admin_id:8,status:'Active',valid_from:'2020-01-01',valid_to:'2099-01-01',subscription_active:true,password:'PRIVATE'};
const req=(token='staff-token',path='me')=>new NextRequest('https://test/api/'+path,{headers:token?{cookie:'session='+token}:{}});
function database(record,workspace={members:[],accounts:[],plans:[]}){
 const calls=[];
 const sql=async(strings,...values)=>{const text=strings.join('?');calls.push({text,values});return text.includes('WITH member_rows AS')?[workspace]:record?[record]:[];};
 return {sql,calls};
}

test('startup session reads preserve public profiles for all roles and exclude credentials',async()=>{
 for(const role of ['admin','manager','supervisor','superadmin','member']){
  const m=role==='member',u=m?member:{...staff,role,public_id:role==='superadmin'?'sp00':'staff-id',location_id:role==='manager'?3:null,created_by:8};
  const f=database(u),r=await sessionReadApi(req(m?'m.test':'staff-token'),f.sql),data=await r.json();
  assert.equal(r.status,200);assert.equal(data.role,role);assert.equal(data.id,u.id);
  assert.equal(JSON.stringify(data).includes('PRIVATE'),false);assert.equal(f.calls.length,1);
  assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('server-timing'),/session;dur=/);
  assert.match(f.calls[0].text,/s.expires_at>NOW\(\)/);assert.ok(f.calls[0].values.includes(tokenHash(m?'m.test':'staff-token')));
  if(m){assert.match(f.calls[0].text,/s.phone=m.phone/);assert.match(f.calls[0].text,/m.password_ready=TRUE/);}
 }
});

test('missing and revoked sessions cannot access profiles or workspaces',async()=>{
 const f=database(null);
 assert.equal((await sessionReadApi(req(null),f.sql)).status,401);assert.equal(f.calls.length,0);
 for(const token of ['staff-token','m.test']){
  assert.equal((await sessionReadApi(req(token),f.sql)).status,401);
  assert.equal((await sessionReadApi(req(token),f.sql,{workspace:true})).status,401);
 }
 assert.equal(f.calls.some(c=>c.text.includes('WITH member_rows AS')),false);
});

test('startup staff route retains disabled, password setup, subscription and main superadmin restrictions',async()=>{
 for(const [change,status,code] of [[{account_enabled:false},401],[{password_ready:false},401],[{subscription_active:false},403,'SUBSCRIPTION_EXPIRED'],[{role:'superadmin',public_id:'other'},401]]){
  const f=database({...staff,...change}),r=await sessionReadApi(req(),f.sql,{workspace:true});
  assert.equal(r.status,status);if(code)assert.equal((await r.json()).code,code);assert.equal(f.calls.length,1);
 }
 const f=database({...staff,role:'superadmin',public_id:'sp00',password_ready:false,subscription_active:false});
 assert.equal((await sessionReadApi(req(),f.sql)).status,200);
});

test('member startup route matches the existing API for expiry, inactivity and organization archival',async()=>{
 for(const change of [{},{status:'Inactive'},{valid_to:'2020-01-02'},{valid_from:'2098-01-01'},{archived_at:'2025-01-01'},{gym_archived:'2025-01-01'},{subscription_active:false}]){
  const f=database({...member,...change}),request=req('m.test');
  const original=await memberSession('me',request,f.sql,'m.test'),fast=await sessionReadApi(request,f.sql);
  assert.equal(fast.status,original.status);assert.deepEqual(await fast.json(),await original.json());
 }
});

test('workspace cannot be read by trainers, employees, members or unassigned managers',async()=>{
 for(const [record,token] of [[{...staff,role:'supervisor',employee_role_name:'Trainer'},'staff-token'],[{...staff,role:'supervisor'},'staff-token'],[member,'m.test'],[{...staff,role:'manager',location_id:null},'staff-token']]){
  const f=database(record),r=await sessionReadApi(req(token,'workspace'),f.sql,{workspace:true});
  assert.equal(r.status,403);assert.equal(f.calls.length,1);
 }
 assert.equal((await sessionReadApi(req(),database({...staff,role:'manager',location_id:null}).sql)).status,403);
});

test('manager workspace keeps server-assigned organization and branch despite posted URL overrides',async()=>{
 const f=database({...staff,id:20,role:'manager',created_by:8,location_id:3});
 const r=await sessionReadApi(req('staff-token','workspace?gymId=999&locationId=999'),f.sql,{workspace:true});
 assert.equal(r.status,200);assert.equal(f.calls.length,2);
 const query=f.calls[1];assert.ok(query.values.includes(8));assert.ok(query.values.includes(3));assert.equal(query.values.includes(999),false);
 assert.match(query.text,/m.admin_id=/);assert.match(query.text,/m.location_id=/);assert.match(query.text,/u.location_id=/);
 assert.match(r.headers.get('server-timing'),/session;dur=.*workspace;dur=/);
});

test('session revocation and subscription changes are read afresh without an authorization cache',async()=>{
 let user=staff,calls=0;const sql=async()=>{calls++;return user?[user]:[];};
 assert.equal((await sessionReadApi(req(),sql)).status,200);
 user={...staff,subscription_active:false};assert.equal((await sessionReadApi(req(),sql)).status,403);
 user=null;assert.equal((await sessionReadApi(req(),sql)).status,401);assert.equal(calls,3);
});

test('dedicated login rejects cross-origin and malformed email before querying the database',async()=>{
 const db=()=>{throw Error('Unexpected database call');};
 const request=(body,origin='https://test')=>new NextRequest('https://test/api/login',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await loginRoute(request({},'https://foreign.test'),db)).status,403);
 assert.equal((await loginRoute(request({email:'invalid'}),db)).status,400);
});

test('dedicated login uses the existing rate limit, password validation and audited session transaction',async()=>{
 const password=await hashPassword('correct-password');let lookups=0,transactions=0;
 const sql=(strings,...values)=>{const text=strings.join('?');return {text,values,then(resolve,reject){lookups++;assert.match(text,/WITH rate AS/);return Promise.resolve([{attempts:1,staff:{...staff,password,password_ready:true},member:null}]).then(resolve,reject);}};};
 sql.transaction=async queries=>{transactions++;assert.equal(queries.length,3);assert.match(queries[0].text,/set_config/);assert.match(queries[2].text,/gym_account_enabled/);assert.match(queries[2].text,/gym_subscription_active/);return [[{}],[],[{user_id:8}]];};
 const request=password=>new NextRequest('https://test/api/login',{method:'POST',headers:{origin:'https://test','Content-Type':'application/json'},body:JSON.stringify({userId:'admin-test',password})});
 const bad=await loginRoute(request('wrong-password'),()=>sql);assert.equal(bad.status,401);assert.equal(transactions,0);
 const good=await loginRoute(request('correct-password'),()=>sql);assert.equal(good.status,200);assert.equal(transactions,1);assert.equal(lookups,2);assert.match(good.headers.get('set-cookie'),/HttpOnly/);
});
