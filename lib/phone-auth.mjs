import {createHmac,randomInt,timingSafeEqual} from 'node:crypto';
import {tokenHash} from './password.mjs';
import {normalizeWhatsAppPhone} from './whatsapp.mjs';
export const loginPhone=(phone,country='IN')=>normalizeWhatsAppPhone(phone,country||'IN');
export const makeOtp=()=>String(randomInt(0,1000000)).padStart(6,'0');
export const otpDigest=(challenge,code)=>tokenHash(challenge+'|'+code);
export const validAuthToken=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function matchesOtp(challenge,code,digest){if(!validAuthToken(challenge)||typeof code!=='string'||!/^\d{6}$/.test(code)||!validAuthToken(digest))return false;return timingSafeEqual(Buffer.from(otpDigest(challenge,code),'hex'),Buffer.from(digest,'hex'));}

// A resend repeats the active code without storing it in plaintext.
export function otpCodeForChallenge(challenge,secret){if(!validAuthToken(challenge)||!secret)throw new Error('Invalid OTP challenge');return String(createHmac('sha256',secret).update('gym-whatsapp-otp-v1|'+challenge).digest().readUInt32BE(0)%1000000).padStart(6,'0');}
