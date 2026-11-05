export default function GymBrand({name}) {
 const label=name||'Gym Management';
 return <div className="brand gym-brand" title={label}><span>{label}</span></div>;
}
