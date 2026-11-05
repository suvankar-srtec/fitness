export function supervisorNeedsLocation(user){return user.role==='supervisor'&&(!user.location_id||user.session_location_id!==user.location_id);}
export function selectedLocationId(value){if(typeof value!=='number'&&typeof value!=='string')return null;if(typeof value==='string'&&!/^\d+$/.test(value))return null;const id=Number(value);return Number.isInteger(id)&&id>0&&id<=2147483647?id:null;}
export function canSelectSupervisorLocation(user,value){const id=selectedLocationId(value);return user.role==='supervisor'&&id!==null&&id===user.location_id;}
