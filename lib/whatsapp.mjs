import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizeWhatsAppPhone(value, country) {
  if (typeof value !== 'string' || !/^\+?[\d ()-]+$/.test(value.trim())) return null;
  if(country){
    try {const phone=parsePhoneNumberFromString(value,country);return phone?.isPossible()?phone.number:null;}catch{return null;}
  }
  const digits = value.replace(/[+ ()-]/g, '');
  return /^[1-9]\d{7,14}$/.test(digits) ? '+' + digits : null;
}

export function memberWhatsAppUrl({phone,name,memberId,plan}) {
  const number=normalizeWhatsAppPhone(phone);
  if(!number)throw new Error('Invalid WhatsApp number');
  return `https://wa.me/${number.slice(1)}?text=${encodeURIComponent(`Hello ${name},\nMember ID: ${memberId}\nMembership: ${plan}`)}`;
}
