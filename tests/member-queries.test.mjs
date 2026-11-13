import test from 'node:test';
import assert from 'node:assert/strict';
import {memberQueriesApi} from '../lib/member-queries-api.js';
const request=(method,body,path='')=>new Request('https://gym.test/api/member-queries'+path,{method,...(body?{body:JSON.stringify(body)}:{})});
function mock(results=[]){const calls=[];return {calls,sql:async(parts,...values)=>{calls.push({text:parts.join('?'),values});return results.shift()||[];}};}
test('queries go to the session member gym, ignoring posted ownership',async()=>{const {sql,calls}=mock([[{id:1}]]);const r=await memberQueriesApi(request('POST',{message:' Help ',adminId:99,memberId:99}),{role:'member',id:42,admin_id:7},sql);assert.equal(r.status,201);assert.deepEqual(calls[0].values,[7,42,'Help']);});
test('manager and supervisor cannot view or submit member queries',async()=>{for(const role of ['manager','supervisor','superadmin']){const {sql,calls}=mock();assert.equal((await memberQueriesApi(request('GET'),{role,id:7},sql)).status,403);assert.equal(calls.length,0);}});
test('admin inbox and unread count stay in own gym',async()=>{for(const path of ['', '?unread=1']){const {sql,calls}=mock([[{count:2}]]);assert.equal((await memberQueriesApi(request('GET',null,path),{role:'admin',id:7},sql)).status,200);assert.deepEqual(calls[0].values,[7]);assert.match(calls[0].text,/admin_id=/);}});
test('mark read rejects foreign gym query and members cannot read inbox',async()=>{const {sql,calls}=mock();assert.equal((await memberQueriesApi(request('PATCH',{id:99}),{role:'admin',id:7},sql)).status,404);assert.deepEqual(calls[0].values,[99,7]);assert.equal((await memberQueriesApi(request('GET'),{role:'member',id:42,admin_id:7},sql)).status,405);});
test('blank and oversized queries never write',async()=>{for(const message of ['  ','a'.repeat(2001)]){const {sql,calls}=mock();assert.equal((await memberQueriesApi(request('POST',{message}),{role:'member',id:42,admin_id:7},sql)).status,400);assert.equal(calls.length,0);}});
