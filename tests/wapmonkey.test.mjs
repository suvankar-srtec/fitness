import test from 'node:test';import assert from 'node:assert/strict';
import {sendWapMonkeyGatePass} from '../lib/wapmonkey.mjs';
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
