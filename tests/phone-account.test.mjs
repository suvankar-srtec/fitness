import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePhoneAccount} from '../lib/phone-account.mjs';
import {tokenHash} from '../lib/password.mjs';

test('one phone login resolves members and staff without a role selector',async()=>{
 for(const action of ['login','otp-request']){
  for(const source of ['members','users',null]){
   const sql=async(strings,...values)=>{assert.match(strings.join('?'),/account_phone_registry/);assert.equal(values[0],'+919876543210');return source?[{source_table:source}]:[];};
   assert.equal(await resolvePhoneAccount(action,{phone:'9876543210',country:'IN'},sql),source==='members'?'member':'staff');
  }
 }
});
test('superadmin ID bypasses phone discovery; invalid numbers do not query',async()=>{
 const sql=()=>{throw Error('Unexpected lookup');};
 assert.equal(await resolvePhoneAccount('login',{userId:'sp00'},sql),'staff');
 assert.equal(await resolvePhoneAccount('otp-request',{phone:'invalid'},sql),'staff');
});
test('OTP verification and password setup resolve the original member challenge',async()=>{
 const challengeId='a'.repeat(64);
 for(const action of ['otp-verify','otp-set-password']){
  const sql=async(strings,...values)=>{assert.match(strings.join('?'),/member_otp_challenges/);assert.equal(values[0],tokenHash(challengeId));return [{challenge_hash:values[0]}];};
  assert.equal(await resolvePhoneAccount(action,{challengeId},sql),'member');
  assert.equal(await resolvePhoneAccount(action,{challengeId},async()=>[]),'staff');
 }
});
