import {createHmac,timingSafeEqual} from 'node:crypto';
export function mediaSignature(id,expires,key){return createHmac('sha256',key).update(`${id}:${expires}`).digest('hex');}
export function gatePassMediaUrl(id,configuration,now=Date.now()){
 const base=new URL(configuration.publicUrl);if(base.protocol!=='https:'||['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Object.assign(Error('Set APP_URL to the public HTTPS address of this app so WapMonkey can fetch the QR image.'),{code:'CONFIGURATION'});
 const expires=Math.floor(now/1000)+3600;const url=new URL('/api/whatsapp-media',base);url.search=new URLSearchParams({id:String(id),expires:String(expires),signature:mediaSignature(id,expires,configuration.token)}).toString();return url.toString();
}
export function validMediaRequest(params,key,now=Date.now()){
 const id=Number(params.get('id')),expires=Number(params.get('expires')),signature=params.get('signature')||'';
 if(!key||!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(expires)||expires<Math.floor(now/1000)||expires>Math.floor(now/1000)+3600||!/^[a-f0-9]{64}$/.test(signature))return null;
 return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(mediaSignature(id,expires,key),'hex'))?id:null;
}
