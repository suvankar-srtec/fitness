import test from 'node:test';
import assert from 'node:assert/strict';
import {whatsappConfiguration,sendGatePassToWhatsApp} from '../lib/whatsapp-cloud.mjs';
const member={name:'Test Member',public_id:'mem01',phone:'+919876543210',gym_name:'Test Gym',plan:'Gold',status:'Active',valid_from:'2026-01-01',valid_to:'2026-12-31'};
const configuration={token:'test-token',phoneId:'123',version:'v25.0',template:'gym_gate_pass',language:'en'};
test('missing WhatsApp credentials do not pretend to deliver',async()=>{
 assert.equal(whatsappConfiguration({}),null);
 await assert.rejects(sendGatePassToWhatsApp(member,Buffer.from('image'),{configuration:null}),/not configured/);
});
test('uploads the gate-pass image and sends the approved English template with renewal message',async()=>{
 const calls=[];const result=await sendGatePassToWhatsApp(member,Buffer.from('image'),{configuration,fetcher:async(url,options)=>{calls.push({url,options});return calls.length===1?Response.json({id:'media123'}):Response.json({messages:[{id:'wamid.test'}]});}});
 assert.equal(result.messageId,'wamid.test');assert.match(calls[0].url,/\/media$/);assert.ok(calls[0].options.body.get('file') instanceof Blob);
 const body=JSON.parse(calls[1].options.body);assert.equal(body.to,'919876543210');assert.equal(body.template.language.code,'en');assert.equal(body.template.components[0].parameters[0].image.id,'media123');assert.match(body.template.components[1].parameters[6].text,/renew/);assert.equal(calls.length,2);
});
test('provider errors and ambiguous delivery never report success or retry sending',async()=>{
 await assert.rejects(sendGatePassToWhatsApp(member,Buffer.from('image'),{configuration,fetcher:async()=>Response.json({error:{}},{status:400})}),/could not upload/);
 let calls=0;await assert.rejects(sendGatePassToWhatsApp(member,Buffer.from('image'),{configuration,fetcher:async()=>{if(++calls===1)return Response.json({id:'media'});throw Error('network');}}),/status is unknown/);assert.equal(calls,2);
});
