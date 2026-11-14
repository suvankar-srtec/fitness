'use client';
import {useEffect,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
import {MessageNotice} from './MessagePopup';
import styles from './GymAdminRegister.module.css';
const date=value=>value?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z')).replaceAll('/','-'):null;
export default function GymAdminRegister({admins}){
 const [subscriptions,setSubscriptions]=useState({}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;requestApi('gym-subscription?overview=1').then(rows=>{if(active)setSubscriptions(Object.fromEntries(rows.map(row=>[String(row.id),row])));}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 return <section className={styles.register} aria-label="Organization admin register"><MessageNotice>{error}</MessageNotice><table><thead><tr><th>Organization name</th><th>Owner name</th><th>Validity</th><th>Phone number</th><th>Email</th></tr></thead><tbody>{admins.map(admin=>{const plan=subscriptions[String(admin.id)];return <tr key={admin.id}><td>{admin.gymName||'—'}</td><td>{admin.name}</td><td>{plan?[date(plan.valid_from),date(plan.valid_until)||'No expiry'].filter(Boolean).join(' to '):loading?'Loading…':'Unavailable'}</td><td>{admin.phone||'—'}</td><td>{admin.email||'—'}</td></tr>;})}{!admins.length&&<tr><td colSpan={5}>No organization admins</td></tr>}</tbody></table></section>;
}
