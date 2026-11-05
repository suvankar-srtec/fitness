import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestApi} from '../lib/api-client.mjs';
const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
test('temporary read errors recover without surfacing a stale failure',async()=>{
 let calls=0;const result=await requestApi('plans','GET',undefined,{fetcher:async()=>++calls===1?response(503,{error:'Unavailable'}):response(200,[{id:1}]),wait:async()=>{}});
 assert.deepEqual(result,[{id:1}]);assert.equal(calls,2);
});
test('writes are not retried, preventing duplicate records',async()=>{
 let calls=0;await assert.rejects(requestApi('plans','POST',{name:'Plan'},{fetcher:async()=>{calls++;return response(503,{error:'Unavailable'});},wait:async()=>{}}),/Unavailable/);assert.equal(calls,1);
});
test('persistent failure is reported after bounded retries',async()=>{
 let calls=0;await assert.rejects(requestApi('plans','GET',undefined,{fetcher:async()=>{calls++;return response(503,{error:'Please retry'});},wait:async()=>{}}),/Please retry/);assert.equal(calls,3);
});
test('authentication errors are not retried',async()=>{
 let calls=0;await assert.rejects(requestApi('me','GET',undefined,{fetcher:async()=>{calls++;return response(401,{error:'Please sign in'});},wait:async()=>{}}),e=>e.status===401);assert.equal(calls,1);
});

test('expired scan session notifies the UI once, includes cookies and never retries the write',async()=>{
 const original=globalThis.window,events=[];globalThis.window={dispatchEvent:event=>events.push(event.type)};
 try{let calls=0;await assert.rejects(requestApi('gate-pass-scan','POST',{qr:'sample'},{fetcher:async(_url,options)=>{calls++;assert.equal(options.credentials,'same-origin');return response(401,{error:'Please sign in'});}}),e=>e.status===401);assert.equal(calls,1);assert.deepEqual(events,['gym-session-expired']);
 events.length=0;await assert.rejects(requestApi('login','POST',{}, {fetcher:async()=>response(401,{error:'Invalid credentials'})}));assert.deepEqual(events,[]);
 }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
});
