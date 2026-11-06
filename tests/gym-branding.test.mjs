import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizeGymBranding} from '../lib/gym-branding.mjs';
import {formatPassDate,logoAccent} from '../lib/pass-branding.mjs';
const data={gymAddress:'  12 Park Road, Kolkata  ',gymPhone:'9051668952',gymCountry:'IN',gymWebsite:'fitfusion.example'};
test('gym branding validates required contact details and normalizes website',()=>{
 assert.deepEqual(normalizeGymBranding(data),{address:'12 Park Road, Kolkata',phone:'+919051668952',website:'https://fitfusion.example/'});
 for(const change of [{gymAddress:''},{gymPhone:'123'},{gymWebsite:'javascript:alert(1)'},{gymWebsite:'https://user:secret@example.com'}])assert.throws(()=>normalizeGymBranding({...data,...change}),error=>error.code==='GYM_BRANDING_INVALID');
});
test('pass dates use DD MM YYYY without changing the underlying QR dates',()=>{
 assert.equal(formatPassDate('2026-11-06'),'06 11 2026');assert.equal(formatPassDate(null),'Not set');
});
test('logo accent follows its dominant colour and remains readable on white',async()=>{
 const logo=await sharp({create:{width:40,height:40,channels:3,background:'#ff8000'}}).png().toBuffer();
 const color=await logoAccent(logo);const rgb=color.slice(1).match(/../g).map(v=>parseInt(v,16));
 assert.ok(rgb[0]>rgb[1]&&rgb[1]>rgb[2]);assert.ok(rgb[0]<255);assert.equal(await logoAccent(null),'#111111');
});
