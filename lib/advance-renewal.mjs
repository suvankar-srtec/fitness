import {memberToday,validDate} from './members.mjs';
export function renewalDates(validTo,duration,today=memberToday()){
 const days=Number(duration);if(!Number.isInteger(days)||days<1||days>3650||!validDate(today))return null;
 const start=new Date((validDate(validTo)&&validTo>=today?validTo:today)+'T00:00:00Z');
 if(validDate(validTo)&&validTo>=today)start.setUTCDate(start.getUTCDate()+1);
 const end=new Date(start);end.setUTCDate(end.getUTCDate()+days-1);
 return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
}

export function monthlyRenewalDates(validTo,months,today=memberToday()){
 if(![3,6,12].includes(Number(months))||!validDate(today))return null;
 const from=new Date((validDate(validTo)&&validTo>=today?validTo:today)+'T00:00:00Z');
 if(validDate(validTo)&&validTo>=today)from.setUTCDate(from.getUTCDate()+1);
 const end=new Date(from),day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+Number(months));
 const lastDay=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,lastDay));end.setUTCDate(end.getUTCDate()-1);
 return {from:from.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
}
