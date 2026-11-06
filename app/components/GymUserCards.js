'use client';
import {useRef,useState} from 'react';
import {groupGymUsers} from '../../lib/gym-user-groups.mjs';
import {isMainSuperadmin} from '../../lib/user-permissions.mjs';
const roles=[['admin','Admins'],['manager','Managers'],['supervisor','Supervisors']];
function CompanyAvatar({name,logo}){
 const [failed,setFailed]=useState(false);
 return <div className="gym-team-logo">{logo&&!failed?<img src={logo} alt={name+' logo'} onError={()=>setFailed(true)}/>:<span aria-hidden="true">{name?.trim().charAt(0).toUpperCase()||'G'}</span>}</div>;
}
function GymEnvelope({gym,onOpen}){
 const [accent,setAccent]=useState('#555555');
 function readLogo(event){
  try{
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
   const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(event.currentTarget,0,0,32,32);
   const pixels=context.getImageData(0,0,32,32).data;const buckets=new Map();
   for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(pixels[i+3]<128||Math.max(r,g,b)-Math.min(r,g,b)<35)continue;const key=[r>>5,g>>5,b>>5].join(',');const bucket=buckets.get(key)||{r:0,g:0,b:0,n:0};bucket.r+=r;bucket.g+=g;bucket.b+=b;bucket.n++;buckets.set(key,bucket);}
   const best=[...buckets.values()].sort((a,b)=>b.n-a.n)[0];if(best)setAccent('rgb('+[best.r,best.g,best.b].map(value=>Math.round(value/best.n)).join(',')+')');
  }catch{/* A remote logo without CORS permission uses the neutral fallback. */}
 }
 const owner=gym.users.find(user=>user.role==='admin');
 return <button type="button" className="gym-pocket" style={{'--gym-accent':accent}} onClick={()=>onOpen(gym)} aria-label={'Open '+gym.name+' accounts'}><span className="gym-pocket-insert gym-pocket-insert-back" aria-hidden="true"/><span className="gym-pocket-insert gym-pocket-insert-front">{gym.logo?<img src={gym.logo} alt={gym.name+' logo'} onLoad={readLogo}/>:<span className="gym-pocket-initial">{gym.name?.trim().charAt(0).toUpperCase()||'G'}</span>}</span><span className="gym-pocket-front"><strong>{gym.name}</strong>{owner?.gymAddress&&<span>{owner.gymAddress}</span>}</span></button>;
}
export default function GymUserCards({users,query,currentUser,canManage,busy,onEdit,onDelete}){
 const {gyms,unassigned}=groupGymUsers(users,query);
 const dialog=useRef(null);
 const [selected,setSelected]=useState(null);
 const groups=[...gyms,...(unassigned.length?[{id:'unassigned',name:'Unassigned staff',users:unassigned}]:[])];
 const active=groups.find(gym=>gym.id===selected);
 function close(){dialog.current?.close();setSelected(null);}
 function open(gym){setSelected(gym.id);dialog.current?.showModal();}
 function person(user){
  const editable=canManage&&user.role!=='manager'&&(user.role!=='superadmin'||user.id===currentUser?.id||isMainSuperadmin(currentUser));
  const removable=canManage&&!['superadmin','manager'].includes(user.role);
  return <li className="gym-team-person" key={user.id}><div className="gym-team-person-main"><span className="gym-team-person-avatar" aria-hidden="true">{user.name?.trim().charAt(0).toUpperCase()||'U'}</span><div className="gym-team-person-detail"><div className="gym-team-person-name"><strong>{user.name}</strong><span className="gym-team-user-id">{user.userId}</span></div>{user.phone?<a className="gym-team-phone" href={'tel:'+user.phone}>{user.phone}</a>:user.phoneNeedsUpdate&&<span className="gym-team-phone-missing">Update phone</span>}{user.locationName&&<span className="gym-team-location">{user.locationName}</span>}</div></div>{(editable||removable)&&<div className="gym-team-person-actions">{editable&&<button type="button" className="secondary" disabled={busy} aria-label={'Edit '+user.name} onClick={()=>{close();onEdit(user);}}>Edit</button>}{removable&&<button type="button" className="delete-button" disabled={busy} aria-label={'Delete '+user.name} onClick={()=>onDelete(user)}>Delete</button>}</div>}</li>;
 }
 function card(gym){
  const owner=gym.users.find(user=>user.role==='admin');
  return <article className="gym-team-card" key={gym.id}><header className="gym-team-header"><CompanyAvatar key={gym.logo} name={gym.name} logo={gym.logo}/><div className="gym-team-heading"><h3>{gym.name||'Gym'}</h3>{owner?.gymAddress&&<p>{owner.gymAddress}</p>}</div><button type="button" className="gym-envelope-close" aria-label="Close gym accounts" onClick={close}>&#215;</button></header><div className="gym-team-roles">{roles.map(([role,label])=>{const people=gym.users.filter(user=>user.role===role);return people.length>0&&<section className="gym-team-role" key={role} aria-label={label+' at '+gym.name}><header><h4>{label}</h4><span>{people.length}</span></header><ul>{people.map(person)}</ul></section>;})}</div></article>;
 }
 return <div className="gym-users-directory"><div className="gym-envelope-grid">{groups.map(gym=><GymEnvelope key={gym.id} gym={gym} onOpen={open}/>)}</div>{!groups.length&&<div className="empty">No matching admins</div>}<dialog ref={dialog} className="gym-envelope-dialog" aria-label={active?active.name+' accounts':'Gym accounts'} onCancel={close} onClick={event=>{if(event.target===event.currentTarget)close();}}>{active&&card(active)}</dialog></div>;
}
