export default function NavigationLogoCard({user}){
 return <div className="navigation-logo-card">{user.gymLogo?<img src={user.gymLogo} alt={user.gymName||'Organization logo'}/>:<span aria-hidden="true">{(user.gymName||user.name||'M').trim().charAt(0).toUpperCase()}</span>}<strong>{user.gymName||'Membership Management System'}</strong>{user.locationName&&<small>{user.locationName}</small>}</div>;
}
