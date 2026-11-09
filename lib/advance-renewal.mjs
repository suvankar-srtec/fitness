import {memberToday,validDate} from './members.mjs';
export function renewalDates(validTo,duration,today=memberToday()){
 const days=Number(duration);if(!Number.isInteger(days)||days<1||days>3650||!validDate(today))return null;
 const start=new Date((validDate(validTo)&&validTo>=today?validTo:today)+'T00:00:00Z');
 if(validDate(validTo)&&validTo>=today)start.setUTCDate(start.getUTCDate()+1);
 const end=new Date(start);end.setUTCDate(end.getUTCDate()+days-1);
 return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
}
