import {gatePassMessage} from './gate-pass.mjs';
import {normalizeWhatsAppPhone} from './whatsapp.mjs';
import {gatePassMediaUrl} from './whatsapp-media.mjs';
export async function sendWapMonkeyGatePass(member,{configuration,fetcher=fetch}){
 const phone=normalizeWhatsAppPhone(member.phone);if(!phone)throw Object.assign(Error('Invalid WhatsApp phone number'),{code:'INVALID_PHONE'});
 const url=gatePassMediaUrl(member.id,configuration);
 const payload={message:gatePassMessage(member),media:[{url,caption:'',name:`${member.public_id}-gate-pass.png`}],delay:'0',schedule:null,numbers:phone.slice(1),device_token:configuration.deviceToken};
 return sendWapMonkeyMessage(payload,{configuration,fetcher});
}
async function sendWapMonkeyMessage(payload,{configuration,fetcher}){
 let response,data;
 try{response=await fetcher('https://api.wapmonkey.com/v1/sendmessage',{method:'POST',headers:{Authorization:configuration.token,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});}catch{throw Object.assign(Error('Delivery status is unknown. Check WapMonkey before retrying.'),{code:'DELIVERY_UNKNOWN'});}
 if([429,502,503,504].includes(response.status))throw Object.assign(Error('WapMonkey is temporarily unavailable.'),{code:'DELIVERY_UNKNOWN',reason:'UNAVAILABLE',httpStatus:response.status});
 try{data=await response.json();}catch{throw Object.assign(Error('Delivery status is unknown. Check WapMonkey before retrying.'),{code:'DELIVERY_UNKNOWN',reason:'RESPONSE',httpStatus:response.status});}
 if(!response.ok||data.success===false||data.status===false||['error','failed'].includes(String(data.status).toLowerCase())){
  const hint=String(data.message||data.error?.message||data.error||'').toLowerCase();
  const reason=response.status===401||response.status===403||/api.?key|unauthori|invalid token/.test(hint)?'AUTH':/device|disconnect|not connected|logged out|session/.test(hint)?'DEVICE':/balance|credit|quota/.test(hint)?'BALANCE':'REJECTED';
  throw Object.assign(Error('WapMonkey rejected the message.'),{code:'MESSAGE_REJECTED',reason,httpStatus:response.status});
 }

 const messageId=data.message_id||data.data?.message_id||data.id||data.data?.id;
 if(!messageId)throw Object.assign(Error('WapMonkey response needs verification. Check Show API Messages before sending again.'),{code:'DELIVERY_UNKNOWN'});
 return {messageId:String(messageId)};
}

export async function sendWapMonkeyOtp(phone,code,{configuration,fetcher=fetch,expiresIn=600}){
 const number=normalizeWhatsAppPhone(phone);if(!number||!/^\d{6}$/.test(code))throw new Error('Invalid OTP request');
 return sendWapMonkeyMessage({message:'Your Membership Management System verification code is '+code+'. It expires in '+Math.max(1,Math.ceil(expiresIn/60))+' minutes. Do not share this code.',media:[],delay:'0',schedule:null,numbers:number.slice(1),device_token:configuration.deviceToken},{configuration,fetcher});
}
export async function sendWapMonkeyInvitation(user,{configuration,fetcher=fetch}){
 const phone=normalizeWhatsAppPhone(user.phone);if(!phone)throw new Error('Update this account phone number first');
 const setup=new URL('/?setup=1',configuration.publicUrl).href;
 return sendWapMonkeyMessage({message:'Hello '+user.name+', your organization account is ready.\nMobile number: '+phone+'\nVerify your number with a WhatsApp OTP and set your own password here: '+setup,media:[],delay:'0',schedule:null,numbers:phone.slice(1),device_token:configuration.deviceToken},{configuration,fetcher});
}
