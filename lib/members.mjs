import {normalizeEmail} from './email-otp.mjs';
import { normalizeWhatsAppPhone } from './whatsapp.mjs';
export function validDate(value) {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function memberToday() {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function ageFromDateOfBirth(dob,asOf=memberToday()) {
 if(!validDate(dob)||!validDate(asOf)||dob>asOf)return null;
 return Number(asOf.slice(0,4))-Number(dob.slice(0,4))-(asOf.slice(5)<dob.slice(5)?1:0);
}
export function membershipEndDate(start,days) {
 if(!validDate(start)||!Number.isInteger(Number(days))||Number(days)<1)return '';
 const date=new Date(start+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+Number(days));return date.toISOString().slice(0,10);
}
export function validateMember(data) {
 const groupName=data.groupName??'Default';if(typeof groupName!=='string'||!groupName.trim()||groupName.length>60)return {error:'Select a valid group'};
 const phone=normalizeWhatsAppPhone(data.phone,data.country);
 if(typeof data.name!=='string'||!data.name.trim()||data.name.length>100)return {error:'Enter a name'};
 if(!phone)return {error:'Invalid phone number'};
 const planId=Number(data.planId);
 if(!Number.isInteger(planId)||planId<1||planId>2147483647)return {error:'Select a membership'};
 if(!['Male','Female','Other'].includes(data.gender))return {error:'Select a gender'};
 if(!['Active','Inactive'].includes(data.status))return {error:'Select a status'};
 const optionalNumber=(value,max,integer=false)=>value===''||value==null?null:Number.isFinite(Number(value))&&Number(value)>0&&Number(value)<=max&&(!integer||Number.isInteger(Number(value)))?Number(value):NaN;
 const dob=data.dob==null||data.dob===''?null:data.dob;
 const age=dob?ageFromDateOfBirth(dob):optionalNumber(data.age,120,true),height=optionalNumber(data.heightFt,12),weight=optionalNumber(data.weightKg,1000);
 if(dob&&(age===null||age<1||age>120))return {error:'Select a valid date of birth (age 1 to 120)'};
 if([age,height,weight].some(Number.isNaN))return {error:'Enter valid age, height and weight'};
 if(typeof data.address!=='string'||data.address.length>1000||typeof data.interestedArea!=='string'||data.interestedArea.length>200)return {error:'Enter a valid address and interested area'};
 if(!validDate(data.validFrom)||!validDate(data.validTo)||data.validTo<data.validFrom)return {error:'Enter valid membership dates'};
 let email;try{email=normalizeEmail(data.email);}catch{return {error:'Enter a valid email address'};}
 return {email,groupName:groupName.trim(),name:data.name.trim(),phone,planId,gender:data.gender,dob,age,height,weight,address:data.address.trim(),interestedArea:data.interestedArea.trim(),status:data.status,validFrom:data.validFrom,validTo:data.validTo};
}
