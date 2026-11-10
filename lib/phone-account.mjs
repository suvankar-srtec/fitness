import {normalizeEmail} from './email-otp.mjs';
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

export async function resolveEmailOtpAccount(body,sql){
 const email=normalizeEmail(body.email);if(!email)return null;
 const rows=await sql`SELECT r.phone,r.source_table FROM account_phone_registry r JOIN users u ON r.source_table='users' AND r.record_id=u.id WHERE lower(trim(u.email))=${email} AND gym_account_enabled(u.id) AND u.role IN ('admin','manager','supervisor') UNION ALL SELECT r.phone,r.source_table FROM account_phone_registry r JOIN members m ON r.source_table='members' AND r.record_id=m.id WHERE lower(trim(m.email))=${email} AND gym_member_account_enabled(m.id) LIMIT 2`;
 return rows.length===1?rows[0]:null;
}
