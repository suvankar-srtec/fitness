import test from 'node:test';import assert from 'node:assert/strict';import {NextRequest} from 'next/server.js';
import {startupApi} from '../lib/startup-api.js';import {readStartup} from '../lib/startup-client.mjs';
const staff={id:8,role:'admin',public_id:'admin-test',name:'Test',account_enabled:true,password_ready:true,subscription_active:true,password:'PRIVATE'};
const req=token=>new NextRequest('https://test/api/startup',{headers:token?{cookie:'session='+token}:{}});
const workspace={members:[],accounts:[],plans:[]};
test('startup streams the public profile before workspace finishes using one session lookup',async()=>{
 let queries=0,release;const blocked=new Promise(resolve=>release=resolve);const sql=async strings=>{queries++;if(strings.join('?').includes('WITH member_rows AS')){await blocked;return [workspace];}return [staff];};
 const response=await startupApi(req('session'),sql),reader=response.body.getReader();const first=JSON.parse(new TextDecoder().decode((await reader.read()).value));assert.equal(first.type,'profile');assert.equal(first.data.role,'admin');assert.equal(JSON.stringify(first).includes('PRIVATE'),false);assert.equal(queries,2);
 release();const second=JSON.parse(new TextDecoder().decode((await reader.read()).value));assert.equal(second.type,'workspace');assert.deepEqual(second.data.members,[]);assert.equal((await reader.read()).done,true);assert.equal(queries,2);assert.match(response.headers.get('cache-control'),/no-store/);
});
test('member and employee startup only reads their profile and never a management workspace',async()=>{
 for(const role of ['member','supervisor']){let queries=0;const user=role==='member'?{id:21,name:'Member',public_id:'ME-01',admin_id:8,status:'Active',valid_from:'2020-01-01',valid_to:'2099-01-01',subscription_active:true}: {...staff,role,employee_role_name:'Trainer'};
 const response=await startupApi(req(role==='member'?'m.session':'staff-session'),async()=>{queries++;return [user];});const lines=(await response.text()).trim().split('\n').map(JSON.parse);assert.equal(lines.length,1);assert.equal(lines[0].data.role,role);assert.equal(queries,1);}
});
test('startup retains account, session, subscription, membership and assigned-branch restrictions',async()=>{
 for(const [user,token,status] of [[null,'session',401],[{...staff,account_enabled:false},'session',401],[{...staff,password_ready:false},'session',401],[{...staff,subscription_active:false},'session',403],[{...staff,role:'manager',location_id:null},'session',403],[{...staff,role:'superadmin',public_id:'other'},'session',401],[{id:21,status:'Active',valid_from:'2020-01-01',valid_to:'2020-01-02'},'m.session',403]]){
 let queries=0;const response=await startupApi(req(token),async()=>{queries++;return user?[user]:[];});assert.equal(response.status,status);assert.equal(queries,1);assert.match(response.headers.get('cache-control'),/no-store/);}
 const response=await startupApi(req(null),()=>{throw Error('Unexpected DB read');});assert.equal(response.status,401);
});
test('manager startup workspace is scoped to stored organization and branch',async()=>{
 const calls=[];const response=await startupApi(req('session'),async(strings,...values)=>{const text=strings.join('?');calls.push({text,values});return text.includes('WITH member_rows AS')?[workspace]:[{...staff,id:20,role:'manager',created_by:8,location_id:3}];});await response.text();assert.equal(calls.length,2);assert.match(calls[1].text,/m.location_id=/);assert.ok(calls[1].values.includes(8));assert.ok(calls[1].values.includes(3));
});
test('startup client renders identity before workspace, parsing split UTF-8 stream chunks',async()=>{
 const encoder=new TextEncoder(),payload=encoder.encode(JSON.stringify({type:'profile',data:{id:8,name:'Renée',role:'admin'}})+'\n'+JSON.stringify({type:'workspace',data:{members:[]}})+'\n');let callbacks=0;
 const result=await readStartup(profile=>{callbacks++;assert.equal(profile.name,'Renée');},{fetcher:async()=>new Response(new ReadableStream({start(c){for(let n=0;n<payload.length;n+=3)c.enqueue(payload.slice(n,n+3));c.close();}}))});assert.equal(callbacks,1);assert.deepEqual(result.workspace,{members:[]});
});
test('workspace errors are explicit after the profile instead of restarting authentication',async()=>{
 let queries=0,shown=false;const response=await startupApi(req('session'),async strings=>{queries++;if(strings.join('?').includes('WITH member_rows AS'))throw Error('offline');return [staff];});await assert.rejects(readStartup(()=>shown=true,{fetcher:async()=>response}),error=>error.status===503);assert.equal(shown,true);assert.equal(queries,2);
});
