export function gymWorkspaceScope(user){
 if(user?.role==='admin')return {gymId:user.id,locationId:null};
 if(user?.role==='manager'&&Number.isInteger(user.created_by)&&Number.isInteger(user.location_id)&&user.created_by>0&&user.location_id>0)return {gymId:user.created_by,locationId:user.location_id};
 return null;
}
