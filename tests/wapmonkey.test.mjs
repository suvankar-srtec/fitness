import test from 'node:test';import assert from 'node:assert/strict';
import {sendWapMonkeyGatePass,sendWapMonkeyInvitation} from '../lib/wapmonkey.mjs';
import {gatePassMediaUrl,validMediaRequest} from '../lib/whatsapp-media.mjs';
const configuration={token:'test-key',deviceToken:'test-device',publicUrl:'https://gym.example.com'};
const member={id:1,public_id:'mem01',name:'Member',phone:'+919876543210',gym_name:'Gym',plan:'Gold',status:'Active',valid_from:'2026-01-01',valid_to:'2026-12-31'};
test('WapMonkey sends international number, QR media and renewal message with server authorization',async()=>{
 let calls=0;const sent=await sendWapMonkeyGatePass(member,{configuration,fetcher:async(url,options)=>{calls++;assert.equal(url,'https://api.wapmonkey.com/v1/sendmessage');assert.equal(options.headers.Authorization,'test-key');const body=JSON.parse(options.body);assert.equal(body.numbers,'919876543210');assert.equal(body.device_token,'test-device');assert.match(body.message,/renew/);assert.match(body.media[0].url,/whatsapp-media/);assert.equal(body.schedule,null);return Response.json({message_id:'test-message'});}});assert.equal(calls,1);assert.equal(sent.messageId,'test-message');
});
test('signed media links expire and reject tampering without exposing API credentials',()=>{
 const now=Date.now(),url=new URL(gatePassMediaUrl(1,configuration,now));assert.equal(validMediaRequest(url.searchParams,configuration.token,now),1);assert.ok(!url.href.includes('test-key'));url.searchParams.set('id','2');assert.equal(validMediaRequest(url.searchParams,configuration.token,now),null);const original=new URL(gatePassMediaUrl(1,configuration,now));assert.equal(validMediaRequest(original.searchParams,configuration.token,now+3601000),null);
});
test('WapMonkey failures and unrecognized responses never claim success or retry',async()=>{
 for(const response of [Response.json({success:false}),Response.json({status:true})])await assert.rejects(sendWapMonkeyGatePass(member,{configuration,fetcher:async()=>response}));assert.throws(()=>gatePassMediaUrl(1,{...configuration,publicUrl:'http://localhost:3000'}),/public HTTPS/);
});

test('staff setup invitations use mobile login and never transmit a password',async()=>{
 let calls=0;const result=await sendWapMonkeyInvitation({name:'Supervisor',phone:'+919876543210'},{configuration,fetcher:async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(url,'https://api.wapmonkey.com/v1/sendmessage');assert.equal(options.headers.Authorization,'test-key');assert.equal(body.device_token,'test-device');assert.equal(body.numbers,'919876543210');assert.deepEqual(body.media,[]);assert.ok(body.message.includes('Mobile number: +919876543210'));assert.ok(!body.message.includes('Password:'));assert.ok(body.message.includes('setup=1'));return Response.json({message_id:'invitation-message'});}});assert.equal(calls,1);assert.equal(result.messageId,'invitation-message');
});

test('OTP rejects disconnected sender responses with a safe device reason',async()=>{const {sendWapMonkeyOtp}=await import('../lib/wapmonkey.mjs');await assert.rejects(sendWapMonkeyOtp('+919876543210','123456',{configuration,fetcher:async()=>Response.json({status:'FAILED',message:'Device disconnected'})}),e=>e.code==='MESSAGE_REJECTED'&&e.reason==='DEVICE'&&!e.message.includes('123456'));});

test('provider HTML outages are reported without parsing or automatic retries',async()=>{const {sendWapMonkeyOtp}=await import('../lib/wapmonkey.mjs');for(const status of [429,502,503,504]){let calls=0;await assert.rejects(sendWapMonkeyOtp('+919876543210','123456',{configuration,fetcher:async()=>{calls++;return new Response('<html>Service unavailable</html>',{status});}}),e=>e.code==='DELIVERY_UNKNOWN'&&e.reason==='UNAVAILABLE'&&e.httpStatus===status);assert.equal(calls,1);}});
