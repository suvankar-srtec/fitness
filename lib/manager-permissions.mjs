export function managerScope(user){return user?.role==='manager'&&Number.isInteger(user.created_by)&&user.created_by>0&&Number.isInteger(user.location_id)&&user.location_id>0?{gymId:user.created_by,locationId:user.location_id}:null;}
export function canManageBranchSupervisor(user,target){const scope=managerScope(user);return !!scope&&target?.role==='supervisor'&&target.created_by===scope.gymId&&target.location_id===scope.locationId;}
export function supervisorAssignment(user,body){
 const scope=managerScope(user);if(!scope)return null;
 if(body.gymAdminId!==undefined&&String(body.gymAdminId)!==String(scope.gymId))return null;
 if(body.locationId!==undefined&&String(body.locationId)!==String(scope.locationId))return null;
 if(body.locationName!==undefined&&String(body.locationName).trim().toLowerCase()!==String(user.location_name||'').trim().toLowerCase())return null;
 return scope;
}
