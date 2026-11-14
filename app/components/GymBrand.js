export default function GymBrand({name,logo}) {
 const label=name||'Membership Management System';
 return <div className="brand gym-brand" title={label}>{logo&&<img src={logo} alt=""/>}<span>{label}</span></div>;
}
