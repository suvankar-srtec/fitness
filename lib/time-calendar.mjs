export function calendarMonth(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||'')||Number(month.slice(0,4))<1900||Number(month.slice(0,4))>2200)return null;
 const [year,number]=month.split('-').map(Number),days=new Date(Date.UTC(year,number,0)).getUTCDate();
 return {from:month+'-01',to:month+'-'+days,days,offset:(new Date(month+'-01T00:00:00Z').getUTCDay()+6)%7};
}
export function moveCalendarMonth(month,offset){const date=new Date(month+'-01T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+offset);return date.toISOString().slice(0,7);}
export const timeSpentLabel=minutes=>minutes===null||minutes===undefined?'Exit not scanned':`${Math.floor(minutes/60)}h ${minutes%60}m`;
