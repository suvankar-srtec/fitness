import {memberToday} from './members.mjs';
import {gatePassStatus} from './gate-pass.mjs';
export const memberProfile=m=>({id:m.id,role:'member',userType:'MEM',name:m.name,userId:m.public_id,gymName:m.gym_name,gymLogo:m.gym_logo||'',gymPhone:m.gym_phone,plan:m.plan,validFrom:m.valid_from,validTo:m.valid_to});
export function memberAccessError(m){if(m.archived_at||m.gym_archived||m.status!=='Active')return {error:'Membership is inactive. Contact us: '+(m.gym_phone||''),code:'MEMBER_INACTIVE'};if(gatePassStatus(m,memberToday())==='Expired')return {error:'Last plan expired. Contact us: '+(m.gym_phone||''),code:'MEMBERSHIP_EXPIRED'};if(gatePassStatus(m,memberToday())!=='Active')return {error:'Membership is not active yet. Contact us: '+(m.gym_phone||''),code:'MEMBER_INACTIVE'};return null;}
