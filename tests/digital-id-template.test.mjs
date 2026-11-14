import test from 'node:test';import assert from 'node:assert/strict';import {gatePassMessage} from '../lib/gate-pass.mjs';import {wrapPassAddress} from '../lib/gate-pass-font.mjs';import {memberWelcomeContent} from '../lib/member-welcome-email.mjs';
const member={name:'Pintu',gym_name:'Fit Fusion',public_id:'ME-FIDU-01',plan:'Platinum',valid_from:'2099-11-04',valid_to:'2099-12-04',status:'Active'};
test('digital ID message follows the requested WhatsApp wording and paragraph breaks',()=>{
 assert.equal(gatePassMessage(member,'https://members.example.com/'),'Greetings from *FIT FUSION*\n\nHello *Pintu*,\nYour Fit Fusion Digital ID card is attached.\n\nMember ID: ME-FIDU-01\nPlan: Platinum\nValid from: 2099-11-04\nValid to: 2099-12-04\nShow this QR code to your supervisor for attendance.\nPlease renew before 2099-12-04.\n\nMember portal Login-\nhttps://members.example.com/');
});
test('email preserves the same message with real formatting and a clickable portal link',()=>{
 const {text,html}=memberWelcomeContent(member,'https://members.example.com/');assert.equal(text,gatePassMessage(member,'https://members.example.com/',{bold:false}));assert.ok(html.includes('<strong>FIT FUSION</strong>'));assert.ok(html.includes('<strong>Pintu</strong>'));assert.ok(html.includes('<a href="https://members.example.com/">'));assert.equal(text.includes('*'),false);
 const escaped=memberWelcomeContent({...member,name:'<script>alert(1)</script>'},'https://members.example.com/');assert.equal(escaped.html.includes('<script>'),false);assert.ok(escaped.html.includes('&lt;script&gt;'));
});
test('full addresses fit one or two lines without losing address text',()=>{
 assert.deepEqual(wrapPassAddress('Dum Dum'),['Dum Dum']);const address='First Floor, 123 Jessore Road, Dum Dum, Kolkata, West Bengal, India, 700028';const lines=wrapPassAddress(address);assert.equal(lines.length,2);assert.equal(lines.join(' '),address);
 const long='A'.repeat(150);assert.equal(wrapPassAddress(long).join(''),long);
});
