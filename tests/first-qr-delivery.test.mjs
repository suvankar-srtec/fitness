import test from 'node:test';import assert from 'node:assert/strict';import {gatePassApi} from '../lib/gate-pass-api.js';
const member={id:9,public_id:'ME-FIDU-01',name:'Member',phone:'+919876543210',email:'member@example.com',gym_name:'Organization',plan:'Gold',status:'Active',valid_from:'2026-11-01',valid_to:'2027-05-01',first_delivery:true};
const configuration={provider:'wapmonkey',publicUrl:'https://members.example.com/'};
function sqlFor(person=member){return async strings=>{const query=strings.join('?');if(query.includes('FROM members m JOIN users owner')){assert.match(query,/m.email/);return [{...person}];}if(query.includes('INSERT INTO member_gate_passes'))return [{token:'a'.repeat(64)}];if(query.includes('INSERT INTO whatsapp_gate_pass_messages'))return [{id:77}];return [];};}
const request=()=>new Request('https://app.test/api/whatsapp-gate-pass',{method:'POST',body:JSON.stringify({id:9,requestKey:'first-qr-request-12345'})});
test('first manual QR delivery shares one rendered QR and website across WhatsApp and email',async()=>{
 let rendered=0,whatsapp=0,emails=0;const image=Buffer.from('one-qr');
 const response=await gatePassApi('whatsapp-gate-pass',request(),{role:'admin',id:8},sqlFor(),{configuration,render:async()=>{rendered++;return image;},sendWhatsApp:async(person,png)=>{whatsapp++;assert.equal(person.website_url,'https://members.example.com/');assert.equal(png,image);return {messageId:'wa-77'};},sendEmail:async(sql,person,png)=>{emails++;assert.equal(person.website_url,'https://members.example.com/');assert.equal(png,image);return {accepted:true,messageId:'email-77'};}});
 assert.equal(response.status,200);assert.equal((await response.json()).email.accepted,true);assert.equal(rendered,1);assert.equal(whatsapp,1);assert.equal(emails,1);
});
test('first QR email is attempted even when WhatsApp rejects delivery',async()=>{
 let emails=0;
 const response=await gatePassApi('whatsapp-gate-pass',request(),{role:'admin',id:8},sqlFor(),{configuration,render:async()=>Buffer.from('qr'),sendWhatsApp:async()=>{throw Object.assign(Error('rejected'),{code:'MESSAGE_REJECTED'});},sendEmail:async()=>{emails++;return {accepted:true};}});
 assert.equal(response.status,502);assert.equal(emails,1);
});
test('later QR sends do not repeat the welcome email',async()=>{
 const response=await gatePassApi('whatsapp-gate-pass',request(),{role:'admin',id:8},sqlFor({...member,first_delivery:false}),{configuration,render:async()=>Buffer.from('qr'),sendWhatsApp:async()=>({messageId:'later-wa'}),sendEmail:()=>{throw Error('Unexpected welcome email');}});
 assert.equal(response.status,200);assert.equal('email' in await response.json(),false);
});
