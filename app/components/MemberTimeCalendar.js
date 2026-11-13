'use client';
import {MessageNotice} from './MessagePopup';

import {useEffect,useRef,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
import {memberToday} from '../../lib/members.mjs';
import {calendarMonth,moveCalendarMonth,timeSpentLabel} from '../../lib/time-calendar.mjs';
import styles from './MemberTimeCalendar.module.css';
export function CalendarIcon(){return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/></svg>;}
export default function MemberTimeCalendar({memberId,name,onAttendanceChange}){
 const [month,setMonth]=useState(()=>memberToday().slice(0,7)),[data,setData]=useState(null),[error,setError]=useState(''),[selected,setSelected]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true,pending=false;setData(null);setLoading(true);setError('');setSelected('');
  async function refresh(){if(!active||pending||document.hidden)return;pending=true;try{const result=await requestApi('member-time-calendar?'+new URLSearchParams({month,...(memberId?{memberId:String(memberId)}:{})}));if(active){setData(result);setError('');}}catch(error){if(active)setError(error.message);}finally{pending=false;if(active)setLoading(false);}}
  refresh();const timer=setInterval(refresh,5000);const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('gym-attendance-updates'):null;if(channel)channel.onmessage=refresh;window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;clearInterval(timer);channel?.close();window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[memberId,month]);
 useEffect(()=>{onAttendanceChange?.({days:new Set((data?.days||[]).map(row=>row.date)).size,month,loading});},[data,month,loading,onAttendanceChange]);
 const range=calendarMonth(month),rows=new Map((data?.days||[]).map(row=>[row.date,row])),total=(data?.days||[]).reduce((sum,row)=>sum+(row.minutes||0),0),label=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));
 return <section className={styles.calendar} aria-label="Member time calendar"><header className={styles.heading}><div><h2>{data?.member.name||name||'My gym calendar'}</h2><p>Time in gym</p></div><span className={styles.total}>{timeSpentLabel(total)} recorded</span></header><div className={styles.monthNav}><button type="button" aria-label="Previous month" disabled={month==='1900-01'} onClick={()=>setMonth(moveCalendarMonth(month,-1))}>‹</button><h3 aria-live="polite">{label}</h3><button type="button" aria-label="Next month" disabled={month==='2200-12'} onClick={()=>setMonth(moveCalendarMonth(month,1))}>›</button></div>{error&&<MessageNotice>{error}</MessageNotice>}<div className={styles.grid} aria-busy={loading}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(label=><span className={styles.weekday} key={label}>{label}</span>)}{Array.from({length:range.offset},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:range.days},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'),row=rows.get(date);return <button type="button" key={date} className={styles.day+' '+(row?styles.recorded:'')} aria-label={date+': '+(row?(row.firstIn?timeSpentLabel(row.minutes):'Time not recorded'):'No scan')} aria-pressed={selected===date} onClick={()=>setSelected(date)}><span className={date===memberToday()?styles.today:''}>{i+1}</span><small>{loading?'…':row?(row.firstIn?(row.minutes===null?'No exit':timeSpentLabel(row.minutes)):'No time'):'—'}</small></button>;})}</div></section>;
}
export function MemberCalendarDialog({onClose,...props}){
 const dialog=useRef(null);useEffect(()=>{const element=dialog.current,bodyOverflow=document.body.style.overflow,rootOverflow=document.documentElement.style.overflow;document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';element.showModal();return()=>{element.close();document.body.style.overflow=bodyOverflow;document.documentElement.style.overflow=rootOverflow;};},[]);
 return <dialog ref={dialog} className={styles.dialog} aria-label="Member gym time calendar" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose();}}><button type="button" className={styles.close} aria-label="Close calendar" onClick={onClose}>×</button><MemberTimeCalendar {...props}/></dialog>;
}
