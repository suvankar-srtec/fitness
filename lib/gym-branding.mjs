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
 const gstNumber=String(data.gymGstNumber||'').trim().toUpperCase();
 const gstRate=Number(data.gymGstRate||0);
 if(gstNumber&&!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstNumber))throw brandingError('Enter a valid 15-character GST number');
 if(!Number.isFinite(gstRate)||gstRate<0||gstRate>100)throw brandingError('Enter a GST percentage between 0 and 100');
 return {address,phone,website,gstNumber,gstRate:gstNumber?gstRate:0};
}
