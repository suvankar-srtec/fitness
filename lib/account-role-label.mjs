export function accountRoleLabel(user){
 if(user?.role==='supervisor')return String(user.employeeRoleName||'').toLowerCase()==='trainer'?'Employee / Trainer':'Employee';
 return {admin:'Admin',manager:'Manager',member:'Member',superadmin:'Superadmin'}[user?.role]||'Account';
}
