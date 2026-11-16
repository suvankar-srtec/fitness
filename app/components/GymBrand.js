export default function GymBrand({name,logo}) {
 return <div className="navbar-branding"><div className="navbar-system-name"><span>Membership Management</span><span>System</span></div>{name&&<div className="brand gym-brand" title={name}>{logo&&<img src={logo} alt=""/>}<span>{name}</span></div>}</div>;
}
