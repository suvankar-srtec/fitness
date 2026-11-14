import test from 'node:test';import assert from 'node:assert/strict';
import {sendMemberWelcomeEmail,memberWebsiteUrl} from '../lib/member-welcome-email.mjs';
const member={id:9,name:'Member',email:'MEMBER@example.com',public_id:'ME-FIDU-01',plan:'Gold',gym_name:'Organization',status:'Active',valid_from:'2026-11-01',valid_to:'2027-05-01',website_url:'https://members.example.com/'};
const configuration={token:'test-key',from:'Membership <welcome@example.com>'};
test('welcome email includes the QR attachment and public login website without credentials',async()=>{
 const writes=[];const sql=async(strings,...values)=>{writes.push([strings.join('?'),values]);return [{member_id:9}];};
 const image=Buffer.from('test-qr');let sends=0;
 const sent=await sendMemberWelcomeEmail(sql,member,image,{configuration,fetcher:async(url,options)=>{
  sends++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers['Idempotency-Key'],'member-welcome-9');const body=JSON.parse(options.body);assert.deepEqual(body.to,['member@example.com']);assert.ok(body.text.includes('Member portal Login-\nhttps://members.example.com/'));assert.match(body.text,/Greetings from ORGANIZATION/);assert.ok(body.html.includes('<strong>ORGANIZATION</strong>'));assert.equal(Buffer.from(body.attachments[0].content,'base64').toString(),'test-qr');assert.equal(body.attachments[0].filename,'ME-FIDU-01-gate-pass.png');assert.equal(body.text.includes('test-key'),false);return Response.json({id:'email-9'});
 }});assert.equal(sends,1);assert.equal(sent.accepted,true);assert.match(writes[1][0],/status='accepted'/);
});
test('already attempted welcome emails are not resent',async()=>{
 const result=await sendMemberWelcomeEmail(async()=>[],member,Buffer.from('qr'),{configuration,fetcher:()=>{throw Error('Unexpected send');}});assert.equal(result.skipped,'ALREADY_ATTEMPTED');
});
test('no email or missing email configuration is reported as skipped',async()=>{
 const sql=()=>{throw Error('Unexpected write');};assert.equal((await sendMemberWelcomeEmail(sql,{...member,email:''},Buffer.from('qr'),{configuration})).skipped,'NO_EMAIL');assert.equal((await sendMemberWelcomeEmail(sql,member,Buffer.from('qr'),{configuration:null})).skipped,'NOT_CONFIGURED');
});
test('unknown provider outcomes are recorded and never automatically retried',async()=>{
 const writes=[];const sql=async(strings,...values)=>{writes.push(values);return [{member_id:9}];};let sends=0;
 await assert.rejects(sendMemberWelcomeEmail(sql,member,Buffer.from('qr'),{configuration,fetcher:async()=>{sends++;throw Error('interrupted');}}),error=>error.code==='DELIVERY_UNKNOWN');assert.equal(sends,1);assert.equal(writes.at(-1)[0],'unknown');
});
test('public website strips paths and rejects credential-bearing or insecure URLs',()=>{
 assert.equal(memberWebsiteUrl('https://example.com/path?private=secret'),'https://example.com/');for(const value of ['http://example.com','https://user:password@example.com','invalid'])assert.equal(memberWebsiteUrl(value),null);
});
