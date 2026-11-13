'use client';
import {MessageNotice} from './MessagePopup';

import { useEffect, useState } from 'react';
import { requestApi as api } from '../../lib/api-client.mjs';
import { paymentNotifications } from '../../lib/payment-notifications.mjs';

export default function PaymentNotifications({onViewPayments}) {
 const [notifications,setNotifications]=useState([]),[filter,setFilter]=useState('all'),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let active=true,pending=false;
  async function refresh(){if(pending||document.hidden)return;pending=true;try{const [m,p]=await Promise.all([api('memberships'),api('membership-payments')]);if(active){setNotifications(paymentNotifications(m,p));setError('');}}catch(e){if(active)setError(e.message);}finally{pending=false;if(active)setLoading(false);}}
  refresh();window.addEventListener('focus',refresh);const timer=setInterval(refresh,30000);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[]);
 const records=notifications.filter(n=>filter==='all'||n.type===filter);
 return <section className="payment-notifications" aria-label="Payment notifications"><div className="notification-filters">{[['all','All'],['due','Payment Due'],['received','Payments Received']].map(([key,label])=><button key={key} type="button" className={filter===key?'':'secondary'} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>{error&&<MessageNotice>{error}</MessageNotice>}{loading?<div className="loading">Loading...</div>:<div className="notification-list">{records.map(n=><article className={`payment-notice notice-${n.type}`} key={n.id}><span className="notice-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{n.type==='received'?<><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>}</svg></span><div className="notice-content"><header><h2>{n.title}</h2><time dateTime={n.date}>{n.date}</time></header><p><b>{n.name}</b> · {n.memberId}</p><div className="notice-detail"><span>{n.plan}</span><strong>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(n.amount))}{n.type==='due'?' due':''}</strong></div>{n.type==='received'&&<small>{n.method}</small>}<button type="button" className="notice-open" onClick={onViewPayments}>View Payments <span aria-hidden="true">→</span></button></div></article>)}{!records.length&&!error&&<div className="empty">No payment notifications</div>}</div>}</section>;
}
