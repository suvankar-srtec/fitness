import test from 'node:test';
import assert from 'node:assert/strict';
import {loginPhone,makeOtp,otpDigest,matchesOtp,validAuthToken} from '../lib/phone-auth.mjs';
import {memberPhoneAuthApi} from '../lib/member-phone-auth-api.js';
import {tokenHash,verifyPassword} from '../lib/password.mjs';
import {sendWapMonkeyOtp,sendWapMonkeyInvitation} from '../lib/wapmonkey.mjs';
const configuration={provider:'wapmonkey',token:'test-only',deviceToken:'test-device',publicUrl:'https://gym.example'};
function fixture(){
 const state={attempts:0,rate:1,eligible:true,verified:false,used:false,expired:false,phoneChanged:false,cooldown:false,user:{id:17,public_id:'ad01',name:'Owner',role:'member',phone:'+919876543210'},sent:0};
 const sql=(strings,...values)=>{const text=strings.join('?');let rows=[];
  if(text.includes('INSERT INTO login_attempts'))rows=[{attempts:state.rate}];
  else if(text.includes('SELECT u.id FROM members'))rows=state.eligible?[{id:17}]:[];
  else if(text.includes('INSERT INTO member_otp_challenges')){if(!state.cooldown){state.challenge=values[2];state.digest=values[3];state.attempts=0;state.verified=false;state.used=false;rows=[{user_id:17}];}}
  else if(text.includes('UPDATE member_otp_challenges SET created_at=NOW()')){if(!state.cooldown&&!state.expired&&!state.used&&!state.verified&&!state.phoneChanged&&state.attempts<5&&state.challenge===values[2]&&state.digest===values[3])rows=[{expires_at:new Date(Date.now()+300000).toISOString()}];}
  else if(text.includes('SET attempts=c.attempts+1')){if(!state.expired&&!state.used&&!state.verified&&!state.phoneChanged&&state.attempts<5&&state.challenge===values[0]){state.attempts++;rows=[{otp_hash:state.digest}];}}
  else if(text.includes('SET verified_at=NOW()')){if(!state.verified&&!state.used&&!state.expired&&state.challenge===values[1]){state.verified=true;state.reset=values[0];state.digest='';rows=[{user_id:17}];}}
  else if(text.includes('SELECT u.* FROM member_otp_challenges')){if(state.verified&&!state.used&&!state.expired&&!state.phoneChanged&&state.challenge===values[0]&&state.reset===values[1])rows=[state.user];}
  else if(text.includes('DELETE FROM ')&&text.includes(' WHERE challenge_hash=')){state.deletions=(state.deletions||0)+1;}
  else if(text.includes('WITH claimed AS')){if(state.verified&&!state.used&&!state.expired&&!state.phoneChanged&&state.challenge===values[0]&&state.reset===values[1]){state.used=true;state.password=values[2];rows=[{id:17}];}}
  return Promise.resolve(rows);
 };
 sql.transaction=queries=>Promise.all(queries);
 const dependencies={getConfiguration:()=>configuration,sendOtp:async(_phone,code)=>{state.code=code;state.sent++;if(state.deliveryUnknown)throw Object.assign(Error('Unconfirmed'),{code:'DELIVERY_UNKNOWN'});if(state.deliveryRejected)throw Object.assign(Error('Rejected'),{code:'MESSAGE_REJECTED'});return {messageId:'mock-only'};}};
 const call=async(action,body)=>{const response=await memberPhoneAuthApi(action,new Request('https://gym.example/api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),sql,dependencies);return {status:response.status,data:await response.json()};};
 return {state,call};
}
test('login normalizes country codes and OTP digests never contain the code',()=>{
 assert.equal(loginPhone('9876543210','IN'),'+919876543210');assert.equal(loginPhone('+91 98765-43210','IN'),'+919876543210');assert.equal(loginPhone('sup01'),null);
 const challenge='a'.repeat(64),code=makeOtp(),digest=otpDigest(challenge,code);assert.match(code,/^\d{6}$/);assert.ok(matchesOtp(challenge,code,digest));assert.equal(matchesOtp(challenge,'000000','invalid'),false);assert.ok(validAuthToken(digest));assert.ok(!digest.includes(challenge));
});
test('member OTP setup verifies ownership before saving a user-selected password and rejects replay',async()=>{
 const {state,call}=fixture();const request=await call('otp-request',{phone:'9876543210',country:'IN'});assert.equal(request.status,202);assert.equal(state.sent,1);assert.deepEqual(Object.keys(request.data).sort(),['challengeId','expiresIn','resendAfter']);
 const challengeId=request.data.challengeId;
 const premature=await call('otp-set-password',{challengeId,resetToken:'b'.repeat(64),password:'short',confirmPassword:'short'});assert.equal(premature.status,400);
 const verification=await call('otp-verify',{challengeId,code:state.code});assert.equal(verification.status,200);assert.ok(validAuthToken(verification.data.resetToken));assert.equal((await call('otp-verify',{challengeId,code:state.code})).status,400);
 const proof={challengeId,resetToken:verification.data.resetToken,password:'x',confirmPassword:'x'};
 assert.equal((await call('otp-set-password',proof)).status,200);assert.ok(await verifyPassword('x',state.password));assert.equal((await call('otp-set-password',proof)).status,400);
});
test('member OTP expiry, five-attempt limit, cooldown, rate limit and phone changes are enforced',async()=>{
 const {state,call}=fixture();const {data}=await call('otp-request',{phone:'9876543210',country:'IN'});const challengeId=data.challengeId;
 for(let i=0;i<5;i++)assert.equal((await call('otp-verify',{challengeId,code:state.code==='000000'?'000001':'000000'})).status,400);
 assert.equal((await call('otp-verify',{challengeId,code:state.code})).status,400);assert.equal(state.attempts,5);
 state.cooldown=true;assert.equal((await call('otp-request',{phone:'9876543210',country:'IN'})).status,429);state.rate=7;assert.equal((await call('otp-request',{phone:'9876543210',country:'IN'})).status,429);
 const another=fixture(),next=await another.call('otp-request',{phone:'9876543210',country:'IN'});another.state.expired=true;assert.equal((await another.call('otp-verify',{challengeId:next.data.challengeId,code:another.state.code})).status,400);another.state.expired=false;another.state.phoneChanged=true;assert.equal((await another.call('otp-verify',{challengeId:next.data.challengeId,code:another.state.code})).status,400);
});
test('unknown and staff-only numbers do not send OTPs or reveal account existence',async()=>{
 const {state,call}=fixture();state.eligible=false;const response=await call('otp-request',{phone:'9876543210',country:'IN'});assert.equal(response.status,202);assert.equal(state.sent,0);assert.ok(validAuthToken(response.data.challengeId));
});
test('WhatsApp OTP and setup invitations contain no assigned password',async()=>{
 const fetcher=async(_url,options)=>{const body=JSON.parse(options.body);assert.equal(body.numbers,'919876543210');assert.deepEqual(body.media,[]);assert.ok(!body.message.includes('Password:'));return Response.json({message_id:'mock-only'});};
 await sendWapMonkeyOtp('+919876543210','123456',{configuration,fetcher});await sendWapMonkeyInvitation({name:'Manager',phone:'+919876543210'},{configuration,fetcher});
});

test('resend repeats the valid code without resetting expiry or failed attempts',async()=>{
 const {state,call}=fixture();const first=await call('otp-request',{phone:'9876543210',country:'IN'});const challengeId=first.data.challengeId,original=state.code;
 const wrong=await call('otp-verify',{challengeId,code:original==='000000'?'000001':'000000'});assert.equal(wrong.status,400);assert.match(wrong.data.error,/Incorrect OTP/);assert.equal(state.attempts,1);
 const resent=await call('otp-request',{phone:'9876543210',country:'IN',challengeId});assert.equal(resent.status,202);assert.equal(resent.data.challengeId,challengeId);assert.equal(state.code,original);assert.equal(state.sent,2);assert.equal(state.attempts,1);assert.ok(resent.data.expiresIn<=300);
 assert.equal((await call('otp-verify',{challengeId,code:' '+original+' '})).status,200);
});
test('unconfirmed provider delivery keeps the received OTP usable with an honest delivery status',async()=>{
 const {state,call}=fixture();state.deliveryUnknown=true;const first=await call('otp-request',{phone:'9876543210',country:'IN'});assert.equal(first.status,202);assert.match(first.data.message,/unconfirmed/);const code=state.code;
 const resend=await call('otp-request',{phone:'9876543210',country:'IN',challengeId:first.data.challengeId});assert.equal(resend.status,202);assert.equal(state.code,code);assert.equal((await call('otp-verify',{challengeId:first.data.challengeId,code})).status,200);
});

test('a rejected resend does not remove the original valid code',async()=>{const {state,call}=fixture();const first=await call('otp-request',{phone:'9876543210',country:'IN'});const code=state.code;state.deliveryRejected=true;assert.equal((await call('otp-request',{phone:'9876543210',country:'IN',challengeId:first.data.challengeId})).status,502);assert.equal(state.deletions||0,0);assert.equal((await call('otp-verify',{challengeId:first.data.challengeId,code})).status,200);});
