import {emailConfiguration,normalizeEmail} from './email-otp.mjs';
import {gatePassMessage} from './gate-pass.mjs';
export function memberWebsiteUrl(base=process.env.APP_URL){
 try{const url=new URL(base);if(url.protocol!=='https:'||url.username||url.password)return null;return url.origin+'/';}catch{return null;}
}
export function memberWelcomeContent(member,website){
 const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const text=gatePassMessage(member,website,{bold:false});
 const html='<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#172d49">'+gatePassMessage(member,website).split('\n').map(line=>line===website?'<a href="'+escape(website)+'">'+escape(website)+'</a>':escape(line).replace(/\*([^*]+)\*/g,'<strong>$1</strong>')).join('<br>')+'</div>';
 return {text,html};
}
export async function sendMemberWelcomeEmail(sql,member,image,{configuration=emailConfiguration(),fetcher=fetch}={}){
 const email=normalizeEmail(member.email);
 if(!email)return {skipped:'NO_EMAIL'};
 if(!configuration)return {skipped:'NOT_CONFIGURED'};
 const website=memberWebsiteUrl(member.website_url);
 if(!website)throw Object.assign(new Error('Configure APP_URL with the public member website'),{code:'CONFIGURATION'});
 const [claimed]=await sql`INSERT INTO member_welcome_emails(member_id,recipient,status) VALUES(${member.id},${email},'sending') ON CONFLICT(member_id) DO NOTHING RETURNING member_id`;
 if(!claimed)return {skipped:'ALREADY_ATTEMPTED'};
 try{
  let response;
  try{response=await fetcher('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:'Bearer '+configuration.token,'Content-Type':'application/json','Idempotency-Key':'member-welcome-'+member.id},
   body:JSON.stringify({from:configuration.from,to:[email],subject:'Your '+(member.gym_name||'membership')+' Digital ID card',...memberWelcomeContent(member,website),attachments:[{filename:member.public_id+'-gate-pass.png',content:Buffer.from(image).toString('base64')}]}),signal:AbortSignal.timeout(20000)
  });}catch{throw Object.assign(new Error('Welcome email delivery status is unknown'),{code:'DELIVERY_UNKNOWN'});}
  if(!response.ok)throw Object.assign(new Error('Welcome email was rejected by the email provider'),{code:response.status>=500||response.status===429?'DELIVERY_UNKNOWN':'EMAIL_REJECTED'});
  let sent;try{sent=await response.json();}catch{throw Object.assign(new Error('Welcome email delivery status is unknown'),{code:'DELIVERY_UNKNOWN'});}
  if(!sent.id)throw Object.assign(new Error('Welcome email delivery status is unknown'),{code:'DELIVERY_UNKNOWN'});
  await sql`UPDATE member_welcome_emails SET status='accepted',message_id=${sent.id},sent_at=NOW() WHERE member_id=${member.id}`;
  return {accepted:true,messageId:sent.id};
 }catch(error){
  await sql`UPDATE member_welcome_emails SET status=${error.code==='EMAIL_REJECTED'?'failed':'unknown'} WHERE member_id=${member.id}`;
  throw error;
 }
}
