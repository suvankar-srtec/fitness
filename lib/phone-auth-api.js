import {emailConfiguration,sendEmailOtp} from './email-otp.mjs';
import {NextResponse} from 'next/server.js';
import {randomBytes} from 'node:crypto';
import {loginPhone,otpCodeForChallenge,otpDigest,matchesOtp,validAuthToken} from './phone-auth.mjs';
import {tokenHash,hashPassword} from './password.mjs';
import {sendWapMonkeyOtp} from './wapmonkey.mjs';
import {whatsappConfiguration} from './whatsapp-cloud.mjs';
import {withAuditActor} from './audit-database.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error,status)=>reply({error},status);
export async function phoneAuthApi(action,request,sql,{getConfiguration=whatsappConfiguration,sendOtp=sendWapMonkeyOtp,getEmailConfiguration=emailConfiguration,sendEmail=sendEmailOtp}={}){
 if(request.method!=='POST')return fail('Method not allowed',405);
 const body=await request.json();
 if(action==='otp-request'){
  const phone=loginPhone(body.phone,body.country);if(!phone)return fail('Enter a valid mobile number',400);
  const [rate]=await sql`INSERT INTO login_attempts(key,attempts) VALUES(${tokenHash('otp-request:'+phone)},1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN 1 ELSE login_attempts.attempts+1 END,started_at=CASE WHEN login_attempts.started_at<NOW()-INTERVAL '10 minutes' THEN NOW() ELSE login_attempts.started_at END RETURNING attempts`;
  if(rate.attempts>6)return fail('Too many OTP requests. Try again in 10 minutes.',429);
  const emailMode=body.channel==='email';const configuration=emailMode?getEmailConfiguration():getConfiguration();if(!configuration||configuration.provider!==(emailMode?'resend':'wapmonkey'))return fail(emailMode?'Email verification is not configured. Contact your gym admin.':'WhatsApp verification is not configured. Contact your gym admin.',503);
  let challengeId=validAuthToken(body.challengeId)?body.challengeId:randomBytes(32).toString('hex');
  const [user]=await sql`SELECT u.id,u.email FROM users u JOIN account_phone_registry r ON r.source_table='users' AND r.record_id=u.id AND r.phone=u.phone WHERE u.phone=${phone} AND gym_account_enabled(u.id) AND u.role IN ('admin','manager','supervisor')`;
  // Do not disclose whether a number has a staff account.
  if(!user||(emailMode&&!user.email)){console.info('OTP request: account unavailable');return reply({challengeId,expiresIn:600,resendAfter:60},202);}
  const code=otpCodeForChallenge(challengeId,configuration.token);let expiresIn=600,claimed;
  if(validAuthToken(body.challengeId)){
   [claimed]=await sql`UPDATE phone_otp_challenges SET created_at=NOW() WHERE email_snapshot=${emailMode?user.email:''} AND user_id=${user.id} AND phone=${phone} AND challenge_hash=${tokenHash(challengeId)} AND otp_hash=${otpDigest(challengeId,code)} AND created_at<NOW()-INTERVAL '60 seconds' AND expires_at>NOW() AND verified_at IS NULL AND used_at IS NULL AND attempts<5 RETURNING expires_at`;
   if(!claimed)return fail('This code cannot be resent yet or is no longer active. Go back and request a new OTP.',409);
   expiresIn=Math.max(1,Math.floor((new Date(claimed.expires_at).getTime()-Date.now())/1000));
  }else{
   [claimed]=await sql`INSERT INTO phone_otp_challenges(user_id,phone,challenge_hash,otp_hash,expires_at,email_snapshot) VALUES(${user.id},${phone},${tokenHash(challengeId)},${otpDigest(challengeId,code)},NOW()+INTERVAL '10 minutes',${emailMode?user.email:''}) ON CONFLICT(user_id) DO UPDATE SET email_snapshot=EXCLUDED.email_snapshot,phone=EXCLUDED.phone,challenge_hash=EXCLUDED.challenge_hash,otp_hash=EXCLUDED.otp_hash,expires_at=EXCLUDED.expires_at,created_at=NOW(),attempts=0,verified_at=NULL,used_at=NULL,reset_token_hash=NULL WHERE phone_otp_challenges.created_at<NOW()-INTERVAL '60 seconds' RETURNING user_id`;
   if(!claimed)return fail('Wait 60 seconds before requesting another OTP.',429);
  }
  try{await (emailMode?sendEmail:sendOtp)(emailMode?user.email:phone,code,{configuration,expiresIn});console.info('OTP request: provider accepted');}
  catch(error){
   const reason=['AUTH','DEVICE','BALANCE','REJECTED','UNAVAILABLE','RESPONSE'].includes(error.reason)?error.reason:'UNKNOWN';
   console.warn('OTP request: provider delivery failed',JSON.stringify({code:error.code==='DELIVERY_UNKNOWN'?'DELIVERY_UNKNOWN':'MESSAGE_REJECTED',reason,httpStatus:Number.isInteger(error.httpStatus)?error.httpStatus:null}));
   if(error.code==='DELIVERY_UNKNOWN')return reply({challengeId,expiresIn,resendAfter:60,message:emailMode?'Email delivery is unconfirmed. Check your inbox or resend after 60 seconds.':reason==='UNAVAILABLE'?'WhatsApp provider is temporarily unavailable. Please try again later.':'WhatsApp delivery is unconfirmed. If no code arrives, resend after 60 seconds.'},202);
   if(!validAuthToken(body.challengeId))await sql`DELETE FROM phone_otp_challenges WHERE challenge_hash=${tokenHash(challengeId)}`;
   return fail(emailMode?'Unable to send email OTP. Contact your gym admin.':reason==='DEVICE'?'WhatsApp sender is disconnected. Ask your gym admin to reconnect WapMonkey.':reason==='AUTH'?'WhatsApp authentication failed. Ask your gym admin to check the API settings.':reason==='BALANCE'?'WhatsApp sending balance is unavailable. Contact your gym admin.':'Unable to send the WhatsApp OTP. Please try again later.',502);
  }
  return reply({challengeId,expiresIn,resendAfter:60},202);
 }
 if(!validAuthToken(body.challengeId))return fail('Request a new OTP',400);
 const challengeHash=tokenHash(body.challengeId);
 if(action==='otp-verify'){
  if(typeof body.code!=='string'||!/^\d{6}$/.test(body.code.trim()))return fail('Enter the six-digit OTP',400);
  const [challenge]=await sql`UPDATE phone_otp_challenges c SET attempts=c.attempts+1 WHERE c.challenge_hash=${challengeHash} AND c.expires_at>NOW() AND c.used_at IS NULL AND c.verified_at IS NULL AND c.attempts<5 AND EXISTS(SELECT 1 FROM users u JOIN account_phone_registry r ON r.source_table='users' AND r.record_id=u.id AND r.phone=u.phone WHERE u.id=c.user_id AND u.phone=c.phone AND (c.email_snapshot='' OR c.email_snapshot=u.email) AND gym_account_enabled(u.id) AND u.role IN ('admin','manager','supervisor')) RETURNING c.otp_hash`;
  if(!challenge)return fail('This OTP has expired, was already used, or reached the attempt limit. Request a new OTP.',400);
  if(!matchesOtp(body.challengeId,body.code.trim(),challenge.otp_hash))return fail('Incorrect OTP. Enter the code you received.',400);
  const resetToken=randomBytes(32).toString('hex');
  const updated=await sql`UPDATE phone_otp_challenges SET verified_at=NOW(),otp_hash='',reset_token_hash=${tokenHash(resetToken)} WHERE challenge_hash=${challengeHash} AND verified_at IS NULL AND used_at IS NULL AND expires_at>NOW() AND attempts<=5 RETURNING user_id`;
  if(!updated.length)return fail('OTP already used or expired. Request a new code.',400);
  return reply({resetToken});
 }
 if(action!=='otp-set-password')return fail('Not found',404);
 if(!validAuthToken(body.resetToken)||typeof body.password!=='string'||!body.password.length||body.password!==body.confirmPassword)return fail('Enter matching passwords',400);
 const [user]=await sql`SELECT u.* FROM phone_otp_challenges c JOIN users u ON u.id=c.user_id JOIN account_phone_registry r ON r.source_table='users' AND r.record_id=u.id AND r.phone=u.phone WHERE c.challenge_hash=${challengeHash} AND c.reset_token_hash=${tokenHash(body.resetToken)} AND c.verified_at IS NOT NULL AND c.expires_at>NOW() AND c.used_at IS NULL AND c.phone=u.phone AND (c.email_snapshot='' OR c.email_snapshot=u.email) AND gym_account_enabled(u.id) AND u.role IN ('admin','manager','supervisor')`;
 if(!user)return fail('Verification expired or already used. Request a new OTP.',400);
 const password=await hashPassword(body.password),audited=withAuditActor(sql,user);
 const saved=await audited`WITH claimed AS (UPDATE phone_otp_challenges c SET used_at=NOW(),reset_token_hash=NULL WHERE c.challenge_hash=${challengeHash} AND c.reset_token_hash=${tokenHash(body.resetToken)} AND c.used_at IS NULL AND c.verified_at IS NOT NULL AND c.expires_at>NOW() AND EXISTS(SELECT 1 FROM users u WHERE u.id=c.user_id AND u.phone=c.phone AND (c.email_snapshot='' OR c.email_snapshot=u.email) AND gym_account_enabled(u.id) AND u.role IN ('admin','manager','supervisor')) RETURNING c.user_id,c.phone), updated AS (UPDATE users u SET password=${password},password_ready=TRUE FROM claimed WHERE u.id=claimed.user_id AND u.phone=claimed.phone RETURNING u.id), revoked AS (DELETE FROM sessions WHERE user_id IN (SELECT id FROM updated)) SELECT id FROM updated`;
 return saved.length?reply({ok:true}):fail('Verification expired or already used. Request a new OTP.',400);
}
