'use client';
import {MessageNotice,confirmMessage,showMessage} from './MessagePopup';

import {matchesUserSearch} from '../../lib/user-search.mjs';
import { useState } from 'react';
import {isMainSuperadmin} from '../../lib/user-permissions.mjs';
import UserEditor from './UserEditor';
import GymUserCards from './GymUserCards';
import {requestApi} from '../../lib/api-client.mjs';

export const moduleLabels={membership:'Membership',notifications:'Audit Report',attendance:'Scan Report',reports:'Reports',users:'Admins'};
export default function ManagementModules({type,members,users,plans,currentUser,searchQuery='',canManageUsers=false,onUsersChanged}) {
 const [query,setQuery]=useState(''),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const actions=type==='users'&&canManageUsers;
 async function removeUser(user){if(!await confirmMessage('Delete '+user.name+'? Their records will be kept and access disabled.'))return;setBusy(true);setError('');try{await requestApi('users','DELETE',{id:user.id});await onUsersChanged?.();showMessage('Account deleted. All records have been retained.');}catch(e){showMessage(e.message);}finally{setBusy(false);}}
 if(type==='reports')return <section className="panel"><div className="panelhead"><h3>Reports</h3></div><div className="module-report"><div><span>Members</span><strong>{members.length}</strong></div><div><span>Plans</span><strong>{plans.length}</strong></div><div><span>Users</span><strong>{users.length}</strong></div></div><div className="tablewrap"><table><thead><tr><th>Membership plan</th><th>Members</th></tr></thead><tbody>{Object.entries(members.reduce((counts,m)=>({...counts,[m.plan]:(counts[m.plan]||0)+1}),{})).map(([plan,count])=><tr key={plan}><td>{plan}</td><td>{count}</td></tr>)}</tbody></table></div>{!members.length&&<div className="empty">No memberships</div>}</section>;
 if(type!=='membership'&&type!=='users')return <section className="panel"><div className="panelhead"><h3>{moduleLabels[type]}</h3></div><div className="empty">Not configured</div></section>;
 if(type==='users')return <>{error&&<MessageNotice>{error}</MessageNotice>}<GymUserCards users={users} query={searchQuery} currentUser={currentUser} canManage={canManageUsers} busy={busy} onEdit={user=>{setError('');setEditing(user);}} onDelete={removeUser}/>{editing&&<UserEditor user={editing} gyms={users.filter(user=>user.role==='admin')} onCancel={()=>setEditing(null)} onSaved={async()=>{await onUsersChanged?.();setEditing(null);}}/>}</>;
 const records=(type==='users'?users:members).filter(r=>matchesUserSearch(r,query));
 return <><section className="panel"><div className="panelhead"><h3>{moduleLabels[type]}</h3><input aria-label={`Search ${moduleLabels[type]}`} placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)}/></div>{records.length?<div className="tablewrap"><table><thead><tr><th>{type==='users'?'User ID':'Member ID'}</th><th>Name</th>{type==='users'&&<th>Gym name</th>}<th>{type==='users'?'Role':'Plan'}</th><th>{type==='users'?'Phone':'Joined'}</th>{actions&&<th>Actions</th>}</tr></thead><tbody>{records.map(r=><tr key={r.id}><td className="id">{r.userId||r.memberId}</td><td>{r.name}</td>{type==='users'&&<td>{r.role==='superadmin'?'Not applicable':r.gymName||'Unassigned'}</td>}<td>{type==='users'?(r.role==='admin'?'Admin (Gym owner)':r.role==='superadmin'?'Superadmin':'Supervisor'):r.plan}</td><td>{type==='users'?r.phone:String(r.joined).slice(0,10)}</td>{actions&&<td><div className="row-actions">{(r.role!=='superadmin'||r.id===currentUser?.id||isMainSuperadmin(currentUser))&&<button className="secondary" disabled={busy} onClick={()=>{setError('');setEditing(r);}}>Edit</button>}{r.role!=='superadmin'&&<button className="delete-button" disabled={busy} onClick={()=>removeUser(r)}>Delete</button>}</div></td>}</tr>)}</tbody></table></div>:<div className="empty">No records</div>}{error&&<MessageNotice>{error}</MessageNotice>}</section>{editing&&<UserEditor user={editing} onCancel={()=>setEditing(null)} onSaved={async()=>{await onUsersChanged?.();setEditing(null);}}/>}</>;
}
