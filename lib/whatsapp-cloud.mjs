import {sendWapMonkeyGatePass} from './wapmonkey.mjs';
import {normalizeWhatsAppPhone} from './whatsapp.mjs';
import {renewalMessage} from './gate-pass.mjs';

export function whatsappConfiguration(env=process.env) {
 if((env.WHATSAPP_PROVIDER||'wapmonkey')==='wapmonkey')return env.WAPMONKEY_API_KEY&&env.WAPMONKEY_DEVICE_TOKEN&&env.APP_URL?{provider:'wapmonkey',token:env.WAPMONKEY_API_KEY,deviceToken:env.WAPMONKEY_DEVICE_TOKEN,publicUrl:env.APP_URL}:null;
 if(!env.WHATSAPP_ACCESS_TOKEN||!/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID||''))return null;
 return {token:env.WHATSAPP_ACCESS_TOKEN,phoneId:env.WHATSAPP_PHONE_NUMBER_ID,version:env.WHATSAPP_API_VERSION||'v25.0',template:env.WHATSAPP_GATE_PASS_TEMPLATE||'gym_gate_pass',language:env.WHATSAPP_TEMPLATE_LANGUAGE||'en'};
}
export function gatePassTemplate(member,mediaId,configuration) {
 return {messaging_product:'whatsapp',recipient_type:'individual',to:normalizeWhatsAppPhone(member.phone)?.slice(1),type:'template',template:{name:configuration.template,language:{code:configuration.language},components:[{type:'header',parameters:[{type:'image',image:{id:mediaId}}]},{type:'body',parameters:[member.name,member.gym_name||'organization',member.public_id,member.plan,member.valid_from||'Not set',member.valid_to||'Not set',renewalMessage(member)+(member.website_url?' Member website: '+member.website_url:'')].map(text=>({type:'text',text:String(text).replace(/\s+/g,' ').trim()}))}]}};
}
export async function sendGatePassToWhatsApp(member,image,{configuration=whatsappConfiguration(),fetcher=fetch}={}) {
 if(!configuration)throw Object.assign(new Error('WhatsApp is not configured. Add WAPMONKEY_API_KEY, WAPMONKEY_DEVICE_TOKEN and APP_URL on the server.'),{code:'NOT_CONFIGURED'});
 if(configuration.provider==='wapmonkey')return sendWapMonkeyGatePass(member,{configuration,fetcher});
 if(!normalizeWhatsAppPhone(member.phone))throw Object.assign(new Error('Invalid WhatsApp phone number'),{code:'INVALID_PHONE'});
 if(!/^v\d+\.\d+$/.test(configuration.version))throw Object.assign(new Error('Invalid WhatsApp API version'),{code:'CONFIGURATION'});
 const base=`https://graph.facebook.com/${configuration.version}/${configuration.phoneId}`;
 const headers={Authorization:`Bearer ${configuration.token}`};
 const form=new FormData();form.set('messaging_product','whatsapp');form.set('type','image/png');form.set('file',new Blob([image],{type:'image/png'}),`${member.public_id}-gate-pass.png`);
 const upload=await fetcher(base+'/media',{method:'POST',headers,body:form,signal:AbortSignal.timeout(20000)});
 const uploaded=await upload.json();if(!upload.ok||!uploaded.id)throw Object.assign(new Error('WhatsApp could not upload the gate-pass image. Check the business account settings.'),{code:'UPLOAD_REJECTED'});
 let response;
 try{response=await fetcher(base+'/messages',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(gatePassTemplate(member,uploaded.id,configuration)),signal:AbortSignal.timeout(20000)});}catch{throw Object.assign(new Error('WhatsApp delivery status is unknown. Check WhatsApp Manager before retrying.'),{code:'DELIVERY_UNKNOWN'});}
 const data=await response.json();
 if(!response.ok)throw Object.assign(new Error(`WhatsApp rejected the message${data.error?.code?' (code '+data.error.code+')':''}. Verify the approved image-header template and business account settings.`),{code:'MESSAGE_REJECTED'});
 const id=data.messages?.[0]?.id;if(!id)throw Object.assign(new Error('WhatsApp delivery status is unknown. Check WhatsApp Manager before retrying.'),{code:'DELIVERY_UNKNOWN'});
 return {messageId:id};
}
