import {normalizeWhatsAppPhone} from './whatsapp.mjs';
const brandingError=message=>Object.assign(new Error(message),{code:'GYM_BRANDING_INVALID'});
export function normalizeGymBranding(data){
 const address=typeof data.gymAddress==='string'?data.gymAddress.trim():'';
 if(!address||address.length>400)throw brandingError('Enter a gym address (up to 400 characters)');
 const phone=normalizeWhatsAppPhone(data.gymPhone,data.gymCountry);
 if(!phone)throw brandingError('Enter a valid gym phone number');
 let website=typeof data.gymWebsite==='string'?data.gymWebsite.trim():'';
 if(website){
  if(!/^https?:\/\//i.test(website))website='https://'+website;
  let url;try{url=new URL(website);}catch{throw brandingError('Enter a valid gym website');}
  if(!['http:','https:'].includes(url.protocol)||!url.hostname.includes('.')||url.username||url.password||website.length>250)throw brandingError('Enter a valid gym website');
  website=url.href;
 }
 return {address,phone,website};
}
