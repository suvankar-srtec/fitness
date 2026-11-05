import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWhatsAppPhone,credentialsWhatsAppUrl,memberWhatsAppUrl} from '../lib/whatsapp.mjs';
test('selected country resolves local numbers and rejects impossible lengths',()=>{
  assert.equal(normalizeWhatsAppPhone('9876543210','IN'),'+919876543210');
  assert.equal(normalizeWhatsAppPhone('2025550123','US'),'+12025550123');
  assert.equal(normalizeWhatsAppPhone('020 7946 0018','GB'),'+442079460018');
  assert.equal(normalizeWhatsAppPhone('123','IN'),null);
});
test('member messages include membership information without login credentials',()=>{
  const url=new URL(memberWhatsAppUrl({phone:'+919876543210',name:'Member',memberId:'MEM00001',plan:'Annual'}));
  assert.ok(url.searchParams.get('text').includes('MEM00001'));
  assert.ok(!url.searchParams.get('text').includes('Password:'));
});
test('international numbers normalize and malformed numbers are rejected',()=>{
  assert.equal(normalizeWhatsAppPhone('+91 98765-43210'),'+919876543210');
  for(const phone of ['',null,'123','00012345678','+91abc9876543210','1234567890123456']) assert.equal(normalizeWhatsAppPhone(phone),null);
});
test('WhatsApp message preserves credential special characters and targets correct number',()=>{
  const password='x & ? # +\nsecret';
  const url=new URL(credentialsWhatsAppUrl({phone:'+919876543210',name:'Test User',userId:'SUP0012',password}));
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/919876543210');
  assert.ok(url.searchParams.get('text').includes(`Password: ${password}`));
  assert.ok(url.searchParams.get('text').includes('User ID: SUP0012'));
});
