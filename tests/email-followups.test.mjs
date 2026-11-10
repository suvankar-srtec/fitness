import test from 'node:test';
import assert from 'node:assert/strict';
import {sendEmailOtp,normalizeEmail} from '../lib/email-otp.mjs';
import {phoneAuthApi} from '../lib/phone-auth-api.js';
import {memberPhoneAuthApi} from '../lib/member-phone-auth-api.js';
import {leadFollowupsApi} from '../lib/lead-followups-api.js';
test('Resend uses a saved recipient and fails safely without claiming acceptance',async()=>{
 assert.equal(normalizeEmail(' Test@Gmail.com '),'test@gmail.com');assert.throws(()=>normalizeEmail('bad'));
 let payload;
 await sendEmailOtp('saved@example.com','123456',{configuration:{token:'test',from:'gym@example.com'},fetcher:async(_url,options)=>{payload=JSON.parse(options.body);return Response.json({id:'mock'});}});
 assert.deepEqual(payload.to,['saved@example.com']);assert.match(payload.text,/123456/);
 await assert.rejects(sendEmailOtp('saved@example.com','123456',{configuration:{token:'test',from:'gym@example.com'},fetcher:async()=>new Response('',{status:403})}));
});
for(const handler of [phoneAuthApi,memberPhoneAuthApi])test(handler.name+' sends OTP to the matching saved email',async()=>{
 let sent;
 const sql=async(strings,...values)=>{const text=strings.join('?');if(text.includes('INSERT INTO login_attempts'))return [{attempts:1}];if(text.includes('SELECT u.id,u.email'))return [{id:17,email:'saved@example.com'}];if(text.includes('INSERT INTO')&&text.includes('_otp_challenges')){assert.equal(values[4],'saved@example.com');return [{user_id:17}];}return [];};
 const req=new Request('https://gym.example/api/otp-request',{method:'POST',body:JSON.stringify({phone:'+919876543210',channel:'email',email:'saved@example.com'})});
 const response=await handler('otp-request',req,sql,{getEmailConfiguration:()=>({provider:'resend',token:'test',from:'gym@example.com'}),sendEmail:async(to)=>{sent=to;}});
 assert.equal(response.status,202);assert.equal(sent,'saved@example.com');assert.ok(!(await response.text()).includes('saved@example.com'));
});
test('follow-up history is branch scoped and append only',async()=>{
 const calls=[];const sql=async(strings,...values)=>{calls.push({text:strings.join('?'),values});return [{id:1}];};
 const user={id:4,role:'manager',created_by:17,location_id:7};
 let response=await leadFollowupsApi(new Request('https://gym.example/api/lead-followups',{method:'POST',body:JSON.stringify({leadId:2,date:'2026-11-10',description:'Call next week'})}),user,sql);
 assert.equal(response.status,201);assert.match(calls[0].text,/INSERT INTO lead_followups/);assert.match(calls[0].text,/location_id=/);assert.ok(calls[0].values.includes(7));
 response=await leadFollowupsApi(new Request('https://gym.example/api/lead-followups?leadId=2'),user,sql);assert.equal(response.status,200);assert.match(calls[1].text,/JOIN gym_leads/);
 response=await leadFollowupsApi(new Request('https://gym.example/api/lead-followups?leadId=2'),{role:'member'},sql);assert.equal(response.status,403);
});
import {readFileSync} from 'node:fs';
test('email challenges bind verification and password consumption to the saved email',()=>{for(const file of ['phone-auth-api.js','member-phone-auth-api.js']){const source=readFileSync(new URL('../lib/'+file,import.meta.url),'utf8');assert.equal((source.match(/c.email_snapshot=u.email/g)||[]).length,3);}});

test('follow-up edits preserve old descriptions and are scoped to the gym and branch',async()=>{let query;const sql=async(parts,...values)=>{query={text:parts.join('?'),values};return [{id:3}];};const request=new Request('https://gym.example/api/lead-followups',{method:'PATCH',body:JSON.stringify({id:3,leadId:2,description:'Updated note'})});const response=await leadFollowupsApi(request,{id:9,role:'manager',created_by:17,location_id:7},sql);assert.equal(response.status,200);assert.match(query.text,/FOR UPDATE OF f/);assert.match(query.text,/INSERT INTO lead_followup_edits/);assert.match(query.text,/l.location_id=/);assert.ok(query.values.includes(7));assert.match(query.text,/SET description=/);assert.doesNotMatch(query.text,/SET follow_up_date/);});
test('foreign follow-up edits return not found',async()=>{const response=await leadFollowupsApi(new Request('https://gym.example/api/lead-followups',{method:'PATCH',body:JSON.stringify({id:3,leadId:2,description:'Updated'})}),{id:17,role:'admin'},async()=>[]);assert.equal(response.status,404);});
