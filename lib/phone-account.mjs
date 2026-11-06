import {loginPhone,validAuthToken} from './phone-auth.mjs';
import {tokenHash} from './password.mjs';

// Global phone uniqueness makes account selection unambiguous. Never return
// account existence or account type to the unauthenticated browser.
export async function resolvePhoneAccount(action,body,sql){
 if(action==='login'||action==='otp-request'){
  if(action==='login'&&typeof body.userId==='string'&&body.userId.trim().toLowerCase()==='sp00')return 'staff';
  const phone=loginPhone(body.phone,body.country);
  if(!phone)return 'staff';
  const [account]=await sql`SELECT source_table FROM account_phone_registry WHERE phone=${phone}`;
  return account?.source_table==='members'?'member':'staff';
 }
 if(validAuthToken(body.challengeId)){
  const [challenge]=await sql`SELECT challenge_hash FROM member_otp_challenges WHERE challenge_hash=${tokenHash(body.challengeId)}`;
  if(challenge)return 'member';
 }
 return 'staff';
}
