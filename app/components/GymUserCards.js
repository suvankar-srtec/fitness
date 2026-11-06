'use client';
import {useState} from 'react';
import {groupGymUsers} from '../../lib/gym-user-groups.mjs';
import {isMainSuperadmin} from '../../lib/user-permissions.mjs';
const roles=[['admin','Admins'],['manager','Managers'],['supervisor','Supervisors']];
function CompanyAvatar({name,logo}){
 const [failed,setFailed]=useState(false);
 return <div className="gym-team-logo">{logo&&!failed?<img src={logo} alt={name+' logo'} onError={()=>setFailed(true)}/>:<span aria-hidden="true">{name?.trim().charAt(0).toUpperCase()||'G'}</span>}</div>;
}
export default function GymUserCards({users,query,currentUser,canManage,busy,onEdit,onDelete}){
 const {gyms,unassigned}=groupGymUsers(users,query);
 function person(user){
  const editable=canManage&&user.role!=='manager'&&(user.role!=='superadmin'||user.id===currentUser?.id||isMainSuperadmin(currentUser));
  const removable=canManage&&!['superadmin','manager'].includes(user.role);
  return <li className="gym-team-person" key={user.id}><div className="gym-team-person-main"><span className="gym-team-person-avatar" aria-hidden="true">{user.name?.trim().charAt(0).toUpperCase()||'U'}</span><div className="gym-team-person-detail"><div className="gym-team-person-name"><strong>{user.name}</strong><span className="gym-team-user-id">{user.userId}</span></div>{user.phone?<a className="gym-team-phone" href={'tel:'+user.phone}>{user.phone}</a>:user.phoneNeedsUpdate&&<span className="gym-team-phone-missing">Update phone</span>}{user.locationName&&<span className="gym-team-location">{user.locationName}</span>}</div></div>{(editable||removable)&&<div className="gym-team-person-actions">{editable&&<button type="button" className="secondary" disabled={busy} aria-label={'Edit '+user.name} onClick={()=>onEdit(user)}>Edit</button>}{removable&&<button type="button" className="delete-button" disabled={busy} aria-label={'Delete '+user.name} onClick={()=>onDelete(user)}>Delete</button>}</div>}</li>;
 }
 function card(gym){
  const owner=gym.users.find(user=>user.role==='admin');
  return <article className="gym-team-card" key={gym.id}><header className="gym-team-header"><CompanyAvatar key={gym.logo} name={gym.name} logo={gym.logo}/><div className="gym-team-heading"><h3>{gym.name||'Gym'}</h3>{owner?.gymAddress&&<p>{owner.gymAddress}</p>}</div><span className="gym-team-total">{gym.users.length} {gym.users.length===1?'account':'accounts'}</span></header><div className="gym-team-roles">{roles.map(([role,label])=>{const people=gym.users.filter(user=>user.role===role);return people.length>0&&<section className="gym-team-role" key={role} aria-label={label+' at '+gym.name}><header><h4>{label}</h4><span>{people.length}</span></header><ul>{people.map(person)}</ul></section>;})}</div></article>;
 }
 return <div className="gym-users-directory"><div className="gym-team-grid">{gyms.map(card)}{!!unassigned.length&&card({id:'unassigned',name:'Unassigned staff',users:unassigned})}</div>{!gyms.length&&!unassigned.length&&<div className="empty">No matching admins</div>}</div>;
}
