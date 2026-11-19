'use client';
import {useState} from 'react';
import {dashboardRevenue} from '../../lib/dashboard-revenue.mjs';
import {memberToday} from '../../lib/members.mjs';
import styles from './AdminHome.module.css';
const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v)||0);
export default function ManagerRevenuePanel({revenue=[],locationName='',loading=false}){
 const today=memberToday(),[period,setPeriod]=useState(6),[from,setFrom]=useState(''),[to,setTo]=useState(''),[range,setRange]=useState(null);
 const months=Array.from({length:period},(_,i)=>{const d=new Date((range?.to||today)+'T00:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-period+1+i);return {key:d.toISOString().slice(0,7),label:d.toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'})};});
 const start=range?.from||months[0].key+'-01',end=range?.to||today;
 // The existing manager API supplies only the assigned location's payments.
 const {selected,total,modes}=dashboardRevenue(revenue,start,end,today);
 const chart=months.map(m=>({...m,amount:selected.filter(r=>r.date?.startsWith(m.key)).reduce((sum,r)=>sum+Number(r.amount||0),0)})),max=Math.max(1,...chart.map(m=>m.amount));
 return <section className={styles.panel} aria-label="Location-wise monthly revenue" style={{marginTop:16}}>
  <header className={styles.panelHeader}><div><h2>Monthly revenue — {locationName||'Assigned location'}</h2><small>Payments received for your assigned location</small></div><strong>{loading?'…':money(total)}</strong></header>
  <div className={styles.periods}>{[3,6,12].map(n=><button type="button" key={n} aria-pressed={period===n&&!range} onClick={()=>{setPeriod(n);setRange(null);setFrom('');setTo('');}}>Last {n} months</button>)}</div>
  <form className={styles.range} onSubmit={e=>{e.preventDefault();if(!from||!to||from>to)return;setRange({from,to});setPeriod(Math.min(120,Math.max(1,(Number(to.slice(0,4))-Number(from.slice(0,4)))*12+Number(to.slice(5,7))-Number(from.slice(5,7))+1)));}}>
   <label>From<input type="date" required value={from} max={to||today} onChange={e=>setFrom(e.target.value)}/></label>
   <label>To<input type="date" required value={to} min={from} max={today} onChange={e=>setTo(e.target.value)}/></label>
   <button type="button" onClick={()=>{setRange(null);setPeriod(6);setFrom('');setTo('');}}>Reset</button><button type="submit">Apply</button>
  </form>
  <div className={styles.bars} role="img" aria-label={chart.map(m=>m.label+': '+money(m.amount)).join(', ')}>{chart.map(m=><div key={m.key} className={styles.barColumn}><small>{loading?'…':money(m.amount)}</small><div className={styles.barTrack}><div title={money(m.amount)} style={{height:Math.max(1,m.amount/max*100)+'%'}}/></div><span>{m.label}</span></div>)}</div>
  <h2 style={{marginTop:20}}>Payment modes</h2><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>{['Cash','Online'].map(mode=><div key={mode} className={styles.mode} style={{marginTop:6,minWidth:0}}><div><span>{mode}</span><b>{loading?'…':money(modes[mode])}</b></div><progress max={total||1} value={modes[mode]} aria-label={mode+' revenue share'}/></div>)}</div>
 </section>;
}
