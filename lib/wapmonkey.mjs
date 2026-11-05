import {gatePassMessage} from './gate-pass.mjs';
import {normalizeWhatsAppPhone} from './whatsapp.mjs';
import {gatePassMediaUrl} from './whatsapp-media.mjs';
export async function sendWapMonkeyGatePass(member,{configuration,fetcher=fetch}){
 const phone=normalizeWhatsAppPhone(member.phone);if(!phone)throw Object.assign(Error('Invalid WhatsApp phone number'),{code:'INVALID_PHONE'});
 const url=gatePassMediaUrl(member.id,configuration);
 const payload={message:gatePassMessage(member),media:[{url,caption:'',name:`${member.public_id}-gate-pass.png`}],delay:'0',schedule:null,numbers:phone.slice(1),device_token:configuration.deviceToken};
 let response,data;
 try{response=await fetcher('https://api.wapmonkey.com/v1/sendmessage',{method:'POST',headers:{Authorization:configuration.token,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});}catch{throw Object.assign(Error('Delivery status is unknown. Check WapMonkey before retrying.'),{code:'DELIVERY_UNKNOWN'});}
 try{data=await response.json();}catch{throw Object.assign(Error('Delivery status is unknown. Check WapMonkey before retrying.'),{code:'DELIVERY_UNKNOWN'});}
 if(!response.ok||data.success===false||data.status===false||['error','failed'].includes(data.status))throw Object.assign(Error('WapMonkey rejected the message. Check the API key, device connection and account balance.'),{code:'MESSAGE_REJECTED'});
 const messageId=data.message_id||data.data?.message_id||data.id||data.data?.id;
 if(!messageId)throw Object.assign(Error('WapMonkey response needs verification. Check Show API Messages before sending again.'),{code:'DELIVERY_UNKNOWN'});
 return {messageId:String(messageId)};
}
