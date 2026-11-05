'use client';
import {useState} from 'react';
import {groupGymUsers} from '../../lib/gym-user-groups.mjs';
import {isMainSuperadmin} from '../../lib/user-permissions.mjs';


function CompanyAvatar({name,logo}) {
 const [failed,setFailed]=useState(false);
 return <div className="company-avatar">{logo&&!failed?<img src={logo} alt={name+' logo'} onError={()=>setFailed(true)}/>:<span aria-hidden="true">{name?.trim().charAt(0).toUpperCase()||'G'}</span>}</div>;
}

export default function GymUserCards({users,query,currentUser,canManage,busy,onEdit,onDelete}) {
 const {gyms,unassigned}=groupGymUsers(users,query);
 function userRow(user) {
  const editable=canManage&&(user.role!=='superadmin'||user.id===currentUser?.id||isMainSuperadmin(currentUser));
  return <li className="gym-user-row" key={user.id}>
   <div className="gym-user-avatar" aria-hidden="true">{user.name?.trim().charAt(0).toUpperCase()||'U'}</div>
   <div className="gym-user-detail"><strong>{user.name}</strong><span>{user.userId} · {user.role==='admin'?'Admin (Gym owner)':user.role==='superadmin'?'Superadmin':'Supervisor'}</span>{user.phone&&<a href={'tel:'+user.phone}>{user.phone}</a>}</div>
   {canManage&&<div className="row-actions">{editable&&<button type="button" className="secondary" disabled={busy} onClick={()=>onEdit(user)}>Edit</button>}{user.role!=='superadmin'&&<button type="button" className="delete-button" disabled={busy} onClick={()=>onDelete(user)}>Delete</button>}</div>}
  </li>;
 }
 return <div className="gym-users-directory"><div className="gym-user-cards">

  {gyms.map(gym=><section className="gym-user-card company-profile-card" key={gym.id}><header><CompanyAvatar key={gym.logo} name={gym.name} logo={gym.logo}/><h3>{gym.name||'Gym'}</h3><span className="company-role">{gym.users.filter(user=>user.role==='admin').length} Admin &middot; {gym.users.filter(user=>user.role==='supervisor').length} Supervisors</span></header><ul>{gym.users.map(userRow)}</ul></section>)}
  {!!unassigned.length&&<section className="gym-user-card company-profile-card"><header><CompanyAvatar name="Unassigned"/><h3>Unassigned supervisors</h3></header><ul>{unassigned.map(userRow)}</ul></section>}
 </div>{!gyms.length&&!unassigned.length&&<div className="empty">No matching admins</div>}</div>;
}
