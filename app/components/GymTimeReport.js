'use client';
import {MessageNotice} from './MessagePopup';

import {useEffect,useState} from 'react';
import {MemberCalendarDialog} from './MemberTimeCalendar';
import {requestApi} from '../../lib/api-client.mjs';
import {memberToday} from '../../lib/members.mjs';
import {matchesUserSearch} from '../../lib/user-search.mjs';
const clock=value=>value?new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(value)):'—';
const duration=value=>value===null?'—':`${Math.floor(value/60)}h ${value%60}m`;
export default function GymTimeReport({user}){
 const [roles,setRoles]=useState([]);
 const [calendarMember,setCalendarMember]=useState(null);
 const [range,setRange]=useState(()=>({from:memberToday(),to:memberToday()})),[query,setQuery]=useState(''),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let active=true,pending=false;
  setLoading(true);setError('');
  async function refresh(){
   if(!active||pending||document.hidden)return;
   pending=true;
   try{const data=await requestApi('gym-time-report?'+new URLSearchParams(range));if(active){setRows(data);setError('');}}
   catch(error){if(active)setError(error.message);}
   finally{pending=false;if(active)setLoading(false);}
  }
  refresh();
  const timer=setInterval(refresh,5000);
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('gym-attendance-updates'):null;
  if(channel)channel.onmessage=refresh;
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;clearInterval(timer);channel?.close();window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[range]);
 const filtered=rows.filter(row=>matchesUserSearch(row,query)&&(!roles.length||roles.includes(row.role)));
 const daysPresent=new Set(filtered.map(row=>String(row.role||'member')+'|'+String(row.memberRecordId||row.staffRecordId||row.memberId)+'|'+row.date)).size;
 return <section aria-label="Attendance report"><div className="gym-time-filters"><label>From<input type="date" value={range.from} onChange={e=>setRange({...range,from:e.target.value})}/></label><label>To<input type="date" value={range.to} onChange={e=>setRange({...range,to:e.target.value})}/></label>{user?.role==='admin'&&<fieldset className="gym-time-roles"><legend>Show roles</legend>{[['supervisor','Supervisor'],['manager','Manager']].map(([role,label])=><label key={role}><input type="checkbox" checked={roles.includes(role)} onChange={event=>setRoles(previous=>event.target.checked?[...previous,role]:previous.filter(value=>value!==role))}/>{label}</label>)}</fieldset>}
 <div className="gym-time-present" role="status"><span>Days present</span><strong>{loading?'...':daysPresent}</strong></div><input type="search" aria-label="Search report members" placeholder="Search name, ID or phone" value={query} onChange={e=>setQuery(e.target.value)}/></div>{error&&<MessageNotice>{error}</MessageNotice>}<div className="panel tablewrap"><table><thead><tr><th>Date</th><th>ID</th><th>Name</th><th>Gym Location</th><th>In</th><th>Out</th><th>Time in gym</th><th>Status</th></tr></thead><tbody>{!loading&&filtered.map(row=><tr key={row.id}><td>{row.date.split('-').reverse().join(' ')}</td><td>{row.memberId}</td><td>{row.role&&row.role!=='member'?row.name:<button type="button" className="member-calendar-link" onClick={()=>setCalendarMember(row)}>{row.name}</button>}</td><td>{row.location||'—'}</td><td>{clock(row.firstIn)}</td><td>{clock(row.lastOut)}</td><td>{duration(row.minutes)}</td><td>{!row.firstIn?'Time not recorded':!row.lastOut?'Exit not scanned':'Recorded'}</td></tr>)}</tbody></table>{(loading||!filtered.length)&&<div className="empty" role="status">{loading?'Loading report…':'No matching records'}</div>}</div>{calendarMember&&<MemberCalendarDialog memberId={calendarMember.memberRecordId} name={calendarMember.name} onClose={()=>setCalendarMember(null)}/>}</section>;
}
