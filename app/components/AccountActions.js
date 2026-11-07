export default function AccountActions({role,onSignOut,mobile=false}){
 const label={superadmin:'Superadmin',admin:'Admin',manager:'Manager',supervisor:'Supervisor',member:'Member'}[role]||role;
 return <div className={'account-actions '+(mobile?'mobile-account-actions':'')}><span className="account-role">{label}</span><button type="button" className="logout-button" onClick={onSignOut}>Logout</button></div>;
}
