'use client';
import {MessageNotice} from './MessagePopup';

import {matchesUserSearch} from '../../lib/user-search.mjs';
import {useEffect,useState} from 'react';
import {requestApi as api} from '../../lib/api-client.mjs';
import {memberToday} from '../../lib/members.mjs';
export default function AttendanceWorkspace({searchQuery=''}) {
 const [records,setRecords]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let current=true,pending=false;
  async function refresh(quiet=false){
   if(pending)return;pending=true;if(!quiet)setLoading(true);
   try{const date=memberToday();const rows=await api(`attendance?view=sheet&from=${date}&to=${date}`);if(current){setRecords(rows);setError('');}}
   catch(error){if(current)setError(error.message);}
   finally{pending=false;if(current)setLoading(false);}
  }
  refresh();const refreshVisible=()=>{if(!document.hidden)refresh(true);};
  const timer=setInterval(refreshVisible,10000);window.addEventListener('focus',refreshVisible);document.addEventListener('visibilitychange',refreshVisible);
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('gym-attendance-updates'):null;
  if(channel)channel.onmessage=refreshVisible;
  return()=>{current=false;clearInterval(timer);channel?.close();window.removeEventListener('focus',refreshVisible);document.removeEventListener('visibilitychange',refreshVisible);};
 },[]);
 const visible=records.filter(row=>matchesUserSearch(row,searchQuery));
 return <section className="attendance-workspace">{error&&<MessageNotice>{error}</MessageNotice>}{loading&&<div className="loading">Loading...</div>}<div className="panel tablewrap"><table><thead><tr><th>Date</th><th>Registration No</th><th>Name</th><th>Phone</th><th>Membership</th><th>Attendance</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td>{row.attended_on}</td><td>{row.memberId}</td><td>{row.name}</td><td>{row.phone}</td><td>{row.plan}</td><td><span className={`attendance-pill ${row.status==='Present'?'attendance-present':'attendance-absent'}`}>{row.status}</span></td></tr>)}</tbody></table></div>{!visible.length&&!loading&&<div className="empty">No matching members</div>}</section>;
}
