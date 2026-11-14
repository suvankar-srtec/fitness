import {memberToday,membershipEndDate,validDate} from './members.mjs';
export function memberFormDates(plan,existing=null,today=memberToday()){
 if(existing&&validDate(existing.valid_from)&&validDate(existing.valid_to))return {validFrom:existing.valid_from,validTo:existing.valid_to};
 return {validFrom:today,validTo:membershipEndDate(today,plan?.duration_days)};
}
