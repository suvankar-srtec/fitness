import test from 'node:test';
import assert from 'node:assert/strict';
import {runRenewalReminders,sendRenewalReminder} from '../lib/renewal-reminders.mjs';
test('renewal job sends each expiry and channel once, including concurrent runs',async()=>{
 const saved={...process.env};Object.assign(process.env,{RESEND_API_KEY:'test',RESEND_FROM_EMAIL:'gym@example.com',WHATSAPP_PROVIDER:'wapmonkey',WAPMONKEY_API_KEY:'test',WAPMONKEY_DEVICE_TOKEN:'device',APP_URL:'https://example.com'});
 try{const claims=new Set(),sent=[];const sql=async(strings,...values)=>{const q=strings.join('');if(q.includes('SELECT m.id')){assert.match(q,/date\+3/);assert.match(q,/archived_at IS NULL/);return [{id:1,name:'Test',expiry:'15-11-2026',expiry_key:'2026-11-15',email:'test@example.com',phone:'+919876543210'}];}if(q.includes('INSERT INTO membership_renewal')){const key=values.join(':');if(claims.has(key))return [];claims.add(key);return [{member_id:1}];}return [];};await Promise.all([runRenewalReminders(sql,{send:async(m,c)=>sent.push(c)}),runRenewalReminders(sql,{send:async(m,c)=>sent.push(c)})]);assert.deepEqual(sent.sort(),['email','whatsapp']);}finally{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
});
test('unconfirmed reminder is recorded without duplicate automatic retry',async()=>{
 const saved={...process.env};Object.assign(process.env,{RESEND_API_KEY:'test',RESEND_FROM_EMAIL:'gym@example.com'});
 try{let claimed=false,sends=0,status;const sql=async(strings,...values)=>{const q=strings.join('');if(q.includes('SELECT m.id'))return [{id:1,email:'test@example.com',expiry_key:'2026-11-15'}];if(q.includes('INSERT INTO membership_renewal')){if(claimed)return [];claimed=true;return [{member_id:1}];}if(q.includes("status='unconfirmed'"))status='unconfirmed';return [];};const send=async()=>{sends++;throw Error('timeout');};await runRenewalReminders(sql,{send});await runRenewalReminders(sql,{send});assert.equal(sends,1);assert.equal(status,'unconfirmed');}finally{for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}
});
