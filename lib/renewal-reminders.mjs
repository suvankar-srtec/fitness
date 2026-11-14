import {emailConfiguration} from './email-otp.mjs';
import {whatsappConfiguration} from './whatsapp-cloud.mjs';
export async function sendRenewalReminder(member,channel,{fetcher=fetch}={}){
 const text='Hello '+member.name+', your '+member.gym_name+' membership expires on '+member.expiry+'. Please renew before expiry. Contact: '+(member.gym_phone||'your organization')+'.';
 if(channel==='email'){
  const config=emailConfiguration();if(!config||!member.email)return false;
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json','Idempotency-Key':'renewal-'+member.id+'-'+member.expiry},body:JSON.stringify({from:config.from,to:[member.email],subject:'Membership renewal reminder',text}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('Email reminder rejected');
  return true;
 }
 const config=whatsappConfiguration();if(config?.provider!=='wapmonkey'||!member.phone)return false;
 const response=await fetcher('https://api.wapmonkey.com/v1/sendmessage',{method:'POST',headers:{Authorization:config.token,'Content-Type':'application/json'},body:JSON.stringify({message:text,media:[],delay:'0',schedule:null,numbers:member.phone.replace(/[^0-9]/g,''),device_token:config.deviceToken}),signal:AbortSignal.timeout(20000)});
 const result=await response.json();if(!response.ok||result.success===false||result.status===false||['error','failed'].includes(String(result.status).toLowerCase()))throw new Error('WhatsApp reminder rejected');return true;
}
export async function runRenewalReminders(sql,{send=sendRenewalReminder}={}){
 await sql`CREATE TABLE IF NOT EXISTS membership_renewal_reminders(member_id INTEGER NOT NULL REFERENCES members(id),expiry DATE NOT NULL,channel TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'sending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(member_id,expiry,channel))`;
 const members=await sql`SELECT m.id,m.name,m.email,m.phone,to_char(m.valid_to,'DD-MM-YYYY') AS expiry,to_char(m.valid_to,'YYYY-MM-DD') AS expiry_key,g.gym_name,COALESCE(NULLIF(g.gym_phone,''),g.phone) AS gym_phone FROM members m JOIN users g ON g.id=m.admin_id WHERE m.valid_to=(NOW() AT TIME ZONE 'Asia/Kolkata')::date+3 AND m.archived_at IS NULL AND g.archived_at IS NULL AND m.status='Active'`;
 let sent=0,failed=0;
 for(const member of members)for(const channel of ['email','whatsapp']){
  if(channel==='email'&&(!member.email||!emailConfiguration())||channel==='whatsapp'&&(!member.phone||whatsappConfiguration()?.provider!=='wapmonkey'))continue;
  const claimed=await sql`INSERT INTO membership_renewal_reminders(member_id,expiry,channel) VALUES(${member.id},${member.expiry_key},${channel}) ON CONFLICT DO NOTHING RETURNING member_id`;if(!claimed.length)continue;
  try{await send(member,channel);await sql`UPDATE membership_renewal_reminders SET status='sent' WHERE member_id=${member.id} AND expiry=${member.expiry_key} AND channel=${channel}`;sent++;}
  catch{await sql`UPDATE membership_renewal_reminders SET status='unconfirmed' WHERE member_id=${member.id} AND expiry=${member.expiry_key} AND channel=${channel}`;failed++;}
 }
 return {sent,unconfirmed:failed};
}
