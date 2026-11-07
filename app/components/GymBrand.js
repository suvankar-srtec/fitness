export default function GymBrand({name,logo}) {
 const label=name||'Gym Management';
 return <div className="brand gym-brand" title={label}>{logo&&<img src={logo} alt=""/>}<span>{label}</span></div>;
}
