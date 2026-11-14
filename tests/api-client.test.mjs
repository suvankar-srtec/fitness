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

test('concurrent browser reads share one request but completed reads are refreshed',async()=>{
 const previousWindow=globalThis.window,previousFetch=globalThis.fetch;globalThis.window={};let count=0,release;
 globalThis.fetch=()=>{count++;return new Promise(resolve=>{release=()=>resolve(response(200,[]));});};
 try{const a=requestApi('plans'),b=requestApi('plans');assert.equal(count,1);release();await Promise.all([a,b]);const c=requestApi('plans');assert.equal(count,2);release();await c;}finally{globalThis.fetch=previousFetch;if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
});

test('ID reservations recover from temporary failures with a bounded timeout',async()=>{
 for(const action of ['member-registration','manager-registration']){let calls=0;const result=await requestApi(action,'POST',{}, {fetcher:async(_url,options)=>{assert.ok(options.signal instanceof AbortSignal);calls++;if(calls===1)throw new Error('Network interruption');return response(201,{registrationNo:'mem99'});},wait:async()=>{}});assert.equal(calls,2);assert.equal(result.registrationNo,'mem99');}
});


test('bodyless ID reservation calls send valid JSON through request validation',async()=>{
 for(const action of ['member-registration','manager-registration']){
  const result=await requestApi(action,'POST',undefined,{fetcher:async(url,options)=>{
   const request=new Request('https://gym.test'+url,options);
   assert.deepEqual(await request.clone().json(),{});
   return response(201,{registrationNo:'mem99'});
  }});
  assert.equal(result.registrationNo,'mem99');
 }
});

test('data reads have a timeout signal so an unresponsive server cannot hang forever',async()=>{
 await requestApi('gym-time-report','GET',undefined,{fetcher:async(_url,options)=>{
  assert.ok(options.signal instanceof AbortSignal);
  return response(200,[]);
 }});
});

test('successful writes notify open dashboards, while reads and sign-in do not',async()=>{
 const savedWindow=globalThis.window,savedChannel=globalThis.BroadcastChannel,events=[],messages=[];
 globalThis.window={dispatchEvent:event=>events.push(event.type)};
 globalThis.BroadcastChannel=class{constructor(name){this.name=name;}postMessage(value){messages.push([this.name,value]);}close(){}};
 const options={fetcher:async()=>response(200,{ok:true})};
 try{
  await requestApi('members','PATCH',{id:1},options);
  assert.deepEqual(events,['gym-data-changed']);assert.equal(messages[0][0],'gym-data-updates');
  await requestApi('members','GET',undefined,options);
  await requestApi('login','POST',{},options);
  assert.equal(events.length,1);assert.equal(messages.length,1);
 }finally{globalThis.BroadcastChannel=savedChannel;if(savedWindow===undefined)delete globalThis.window;else globalThis.window=savedWindow;}
});

test('empty write responses give an actionable message without retrying the write',async()=>{
 let calls=0;
 await assert.rejects(requestApi('employees','POST',{}, {fetcher:async()=>{calls++;return new Response(null,{status:500});}}),error=>error.code==='INVALID_RESPONSE'&&error.status===500&&/check whether the record was saved/.test(error.message));
 assert.equal(calls,1);
});
test('interrupted read responses recover on a later attempt',async()=>{
 let calls=0;
 const result=await requestApi('employees','GET',undefined,{fetcher:async()=>++calls===1?new Response('',{status:200}):response(200,[]),wait:async()=>{}});
 assert.deepEqual(result,[]);assert.equal(calls,2);
});
test('persistent non-JSON reads produce a readable error after bounded retries',async()=>{
 let calls=0;
 await assert.rejects(requestApi('employees','GET',undefined,{fetcher:async()=>{calls++;return new Response('<html>Error</html>',{status:500});},wait:async()=>{}}),error=>error.code==='INVALID_RESPONSE'&&/refresh/.test(error.message));
 assert.equal(calls,3);
});

test('writes start a fresh workspace read without older completions discarding it',async()=>{
 const previousWindow=globalThis.window,previousFetch=globalThis.fetch;globalThis.window={dispatchEvent(){}};const releases=[];let reads=0;
 globalThis.fetch=(_url,options)=>options.method==='GET'?new Promise(resolve=>{reads++;releases.push(resolve);}):Promise.resolve(response(200,{ok:true}));
 try{
  const old=requestApi('workspace');await requestApi('employees','PATCH',{id:1});
  const fresh=requestApi('workspace');assert.equal(reads,2);
  releases[0](response(200,{version:'old'}));await old;
  const shared=requestApi('workspace');assert.equal(reads,2);
  releases[1](response(200,{version:'fresh'}));assert.deepEqual(await fresh,{version:'fresh'});assert.deepEqual(await shared,{version:'fresh'});
 }finally{globalThis.fetch=previousFetch;if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
});
