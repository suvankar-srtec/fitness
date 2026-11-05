import {memberToday,validDate} from './members.mjs';

export function gatePassTokenFromQr(text) {
 if(typeof text!=='string'||text.length>4096)return null;
 try{const data=JSON.parse(text);return data?.type==='gym-gate-pass'&&data.version===1&&/^[a-f0-9]{64}$/.test(data.token)?data.token:null;}catch{return null;}
}
export function gatePassStatus(member,date=memberToday()) {
 if(member.status!=='Active')return 'Inactive';
 if(!validDate(member.valid_from)||!validDate(member.valid_to))return 'Not set';
 if(member.valid_from>date)return 'Upcoming';
 return member.valid_to<date?'Expired':'Active';
}
export function renewalMessage(member,date=memberToday()) {
 const status=gatePassStatus(member,date);
 if(status==='Inactive')return 'Your membership is inactive. Contact your gym to renew or reactivate your gate pass.';
 if(status==='Not set')return 'Contact your gym to set your membership validity and renew your gate pass.';
 if(status==='Expired')return `Your membership expired on ${member.valid_to}. Please renew to reactivate your gate pass.`;
 return `Please renew your membership on or before ${member.valid_to}.`;
}
export function gatePassPayload(member,token) {
 return JSON.stringify({type:'gym-gate-pass',version:1,token,memberId:member.public_id,name:member.name,plan:member.plan,validFrom:member.valid_from,validTo:member.valid_to,hasPhoto:!!member.photo});
}
export function gatePassMessage(member) {
 return `Hello ${member.name},\nYour ${member.gym_name||'gym'} gate pass is attached.\nMember ID: ${member.public_id}\nPlan: ${member.plan}\nValid from: ${member.valid_from}\nValid to: ${member.valid_to}\nShow this QR code to your supervisor for attendance.\n${renewalMessage(member)}`;
}
