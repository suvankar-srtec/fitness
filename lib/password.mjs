import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) { const salt=randomBytes(16).toString('hex'); return salt+':'+(await scrypt(password,salt,64)).toString('hex'); }
export async function verifyPassword(password,stored) { const [salt,key]=stored.split(':'); const expected=Buffer.from(key,'hex'); const actual=await scrypt(password,salt,64); return expected.length===actual.length && timingSafeEqual(expected,actual); }
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
