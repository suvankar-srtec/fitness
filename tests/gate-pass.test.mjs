import {outlineGatePassText} from '../lib/gate-pass-font.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {RGBLuminanceSource,BinaryBitmap,HybridBinarizer,QRCodeReader} from '@zxing/library';
import {gatePassTokenFromQr,gatePassPayload,gatePassStatus,renewalMessage,gatePassMessage} from '../lib/gate-pass.mjs';
import {renderGatePass} from '../lib/gate-pass-image.mjs';

const member={public_id:'mem01',name:'Test Member',plan:'Gold',gym_name:'Test Gym',phone:'+919876543210',status:'Active',valid_from:'2026-01-01',valid_to:'2026-12-31'};
const token='a'.repeat(64);
test('gate-pass token requires the expected format and untrusted QR metadata is not an identity',()=>{
 assert.equal(gatePassTokenFromQr(gatePassPayload(member,token)),token);
 for(const value of ['mem01','https://example.com',JSON.stringify({memberId:'mem01'}),JSON.stringify({type:'gym-gate-pass',version:1,token:'invalid'})])assert.equal(gatePassTokenFromQr(value),null);
});
test('gate-pass status checks start, expiry, inactivity and missing dates',()=>{
 assert.equal(gatePassStatus(member,'2026-01-01'),'Active');
 assert.equal(gatePassStatus(member,'2026-12-31'),'Active');
 assert.equal(gatePassStatus(member,'2027-01-01'),'Expired');
 assert.equal(gatePassStatus(member,'2025-12-31'),'Upcoming');
 assert.equal(gatePassStatus({...member,status:'Inactive'},'2026-06-01'),'Inactive');
 assert.equal(gatePassStatus({...member,valid_to:null},'2026-06-01'),'Not set');
 assert.match(renewalMessage(member,'2027-01-01'),/expired.*renew/i);
 assert.match(gatePassMessage(member),/gate pass is attached/);
});
test('generated gate-pass PNG contains a readable QR with member metadata and token',async()=>{
 const photo=await sharp({create:{width:50,height:50,channels:3,background:'#888888'}}).jpeg().toBuffer();
 const image=await renderGatePass({...member,photo:photo.toString('base64')},token);
 const metadata=await sharp(image).metadata();assert.equal(metadata.width,800);assert.equal(metadata.height,920);
 const {data,info}=await sharp(image).extract({left:190,top:400,width:420,height:420}).greyscale().raw().toBuffer({resolveWithObject:true});
 const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(new Uint8ClampedArray(data),info.width,info.height)));
 const decoded=new QRCodeReader().decode(bitmap).getText();assert.equal(gatePassTokenFromQr(decoded),token);const payload=JSON.parse(decoded);assert.equal(payload.name,member.name);assert.equal(payload.plan,member.plan);assert.equal(payload.hasPhoto,true);
});

test('gate-pass text uses real bundled glyph outlines without system fonts',()=>{
 const svg=outlineGatePassText('<svg><text x="100" y="50" text-anchor="middle" font-size="22" fill="white">Fit Fusion &amp; Gym</text></svg>');assert.ok(!svg.includes('<text'));assert.match(svg,/<path d="M/);assert.match(svg,/fill="white"/);assert.notEqual(outlineGatePassText('<text>A</text>'),outlineGatePassText('<text>B</text>'));
});

test('full member names produce complete finite glyph outlines',()=>{
 const text='Suvankar Das';
 const svg=outlineGatePassText('<text x="205" y="210" font-size="36" font-weight="700" data-max-width="330">'+text+'</text>');
 assert.doesNotMatch(svg,/NaN|Infinity/);
 assert.equal((svg.match(/<path /g)||[]).length,text.length);
 assert.match(svg,/transform="translate/);
});
