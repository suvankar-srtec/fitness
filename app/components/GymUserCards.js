'use client';
import {MessageNotice} from './MessagePopup';

import {useEffect,useState} from 'react';
import {groupGymUsers} from '../../lib/gym-user-groups.mjs';
import {requestApi} from '../../lib/api-client.mjs';
import {DashboardIcon} from './DashboardOverview';
import styles from './GymUserCards.module.css';
const formatDate=value=>value?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z')):'No expiry';
export default function GymUserCards({users,query,canManage,busy,onEdit,onDelete}){
 const {gyms,unassigned}=groupGymUsers(users,query);
 const [subscriptions,setSubscriptions]=useState({}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let current=true;setLoading(true);requestApi('gym-subscription?overview=1').then(rows=>{if(current){setSubscriptions(Object.fromEntries(rows.map(row=>[row.id,row])));setError('');}}).catch(error=>{if(current)setError(error.message);}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[users]);
 return <div className={styles.directory}>
 {error&&<MessageNotice>Subscription details unavailable: {error}</MessageNotice>}
 <div className={styles.grid}>{gyms.map(gym=>{const admin=gym.users.find(user=>user.role==='admin'),plan=subscriptions[gym.id],staff=gym.users.filter(user=>user.role!=='admin');return <article className={styles.card} key={gym.id}>
 <header className={styles.header}><span className={styles.logo}>{gym.logo?<img src={gym.logo} alt=""/>:gym.name?.charAt(0)||'G'}</span><div><h3>{gym.name}</h3><p>{admin?.gymAddress||'Address not provided'}</p></div><span className={styles.status} data-active={plan?.active}>{plan?(plan.valid_from>new Date().toISOString().slice(0,10)?'Scheduled':plan.active?'Active':'Expired'):loading?'Loading…':'Unavailable'}</span></header>
 <div className={styles.body}><div className={styles.account}><span className={styles.avatar}>{admin?.name?.charAt(0).toUpperCase()||'A'}</span><div><span className={styles.caption}>GYM ADMIN</span><strong>{admin?.name}</strong><span className={styles.userId}>{admin?.userId}</span></div></div><div className={styles.contacts}><span><DashboardIcon name="membership"/>{admin?.phone?<a href={'tel:'+admin.phone}>{admin.phone}</a>:'Phone not provided'}</span><span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>{admin?.email||'Email not provided'}</span></div>
 <div className={styles.validity}><span>Subscription</span><strong>{plan?(plan.valid_from?formatDate(plan.valid_from)+' – ':'')+formatDate(plan.valid_until):loading?'Loading…':'Unavailable'}</strong></div>
 <div className={styles.limits}>{[['Members','members_used','member_limit'],['Managers','managers_used','manager_limit'],['Supervisors','supervisors_used','supervisor_limit'],['Branches','branches_used','branch_limit']].map(([name,used,limit])=><div key={name}><span>{name}</span><strong>{plan?plan[used]:'—'} <small>/ {plan?(plan[limit]??'Unlimited'):'—'}</small></strong></div>)}</div>
 {staff.length>0&&<details className={styles.staff}><summary>Gym team <span>{staff.length}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><ul>{staff.map(person=><li key={person.id}><span className={styles.staffIcon}><DashboardIcon name={person.role==='manager'?'managers':'supervisors'}/></span><div><strong>{person.name}</strong><span>{person.userId} · {person.role==='manager'?'Manager':'Supervisor'}{person.locationName?' · '+person.locationName:''}</span></div></li>)}</ul></details>}
 </div>{canManage&&admin&&<footer className={styles.footer}><button type="button" className="secondary" disabled={busy} onClick={()=>onEdit(admin)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5"/></svg>Edit admin &amp; plan</button><button type="button" className={styles.remove} disabled={busy} onClick={()=>onDelete(admin)} aria-label={'Delete admin '+admin.name}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg></button></footer>}
 </article>;})}</div>
 {!gyms.length&&<div className={styles.empty}><DashboardIcon name="home"/><h3>No matching gym accounts</h3><p>{query?'Try another name, gym or phone number.':'Create an admin to register a gym.'}</p></div>}
 {unassigned.length>0&&<section className={styles.unassigned}><h3>Unassigned staff</h3>{unassigned.map(person=><p key={person.id}>{person.name} · {person.userId}</p>)}</section>}
 </div>;
}
