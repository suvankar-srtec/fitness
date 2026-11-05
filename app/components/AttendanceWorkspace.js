'use client';
import {useEffect,useState} from 'react';
import {requestApi as api} from '../../lib/api-client.mjs';
import {validDate,memberToday} from '../../lib/members.mjs';
export default function AttendanceWorkspace() {
 const [from,setFrom]=useState(memberToday),[to,setTo]=useState(memberToday),[range,setRange]=useState(()=>({from:memberToday(),to:memberToday()})),[query,setQuery]=useState(''),[status,setStatus]=useState('All'),[records,setRecords]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let current=true,pending=false;
  async function refresh(quiet=false){
   if(pending)return;pending=true;if(!quiet)setLoading(true);
   try{const rows=await api(`attendance?view=sheet&from=${range.from}&to=${range.to}`);if(current){setRecords(rows);setError('');}}
   catch(error){if(current)setError(error.message);}
   finally{pending=false;if(current)setLoading(false);}
  }
  refresh();const refreshVisible=()=>{if(!document.hidden)refresh(true);};
  const timer=setInterval(refreshVisible,10000);window.addEventListener('focus',refreshVisible);document.addEventListener('visibilitychange',refreshVisible);
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('gym-attendance-updates'):null;
  if(channel)channel.onmessage=refreshVisible;
  return()=>{current=false;clearInterval(timer);channel?.close();window.removeEventListener('focus',refreshVisible);document.removeEventListener('visibilitychange',refreshVisible);};
 },[range]);
 function search(event){event.preventDefault();if(!validDate(from)||!validDate(to)||from>to){setError('Select valid attendance dates');return;}setError('');setRange({from,to});}
 const visible=records.filter(row=>(row.name+' '+row.memberId+' '+row.phone).toLowerCase().includes(query.toLowerCase())&&(status==='All'||row.status===status));
 return <section className="attendance-workspace"><form className="attendance-filters sheet-filters" onSubmit={search}><div><label htmlFor="attendanceFrom">From</label><input id="attendanceFrom" type="date" required value={from} onChange={event=>setFrom(event.target.value)}/></div><div><label htmlFor="attendanceTo">To</label><input id="attendanceTo" type="date" required min={from} value={to} onChange={event=>setTo(event.target.value)}/></div><div><label htmlFor="attendanceSearch">Search Member</label><input id="attendanceSearch" placeholder="Search" value={query} onChange={event=>setQuery(event.target.value)}/></div><div><label htmlFor="attendanceStatus">Status</label><select id="attendanceStatus" value={status} onChange={event=>setStatus(event.target.value)}><option>All</option><option>Present</option><option>Absent</option></select></div><button type="submit" disabled={loading}>Search</button></form>{error&&<p className="error" role="alert">{error}</p>}{loading&&<div className="loading">Loading...</div>}<div className="attendance-sheet-summary"><span>Present: <b>{visible.filter(row=>row.status==='Present').length}</b></span><span>Absent: <b>{visible.filter(row=>row.status==='Absent').length}</b></span></div><div className="panel tablewrap"><table><thead><tr><th>Date</th><th>Registration No</th><th>Name</th><th>Phone</th><th>Membership</th><th>Attendance</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td>{row.attended_on}</td><td>{row.memberId}</td><td>{row.name}</td><td>{row.phone}</td><td>{row.plan}</td><td><span className={`attendance-pill ${row.status==='Present'?'attendance-present':'attendance-absent'}`}>{row.status}</span></td></tr>)}</tbody></table></div>{!visible.length&&!loading&&<div className="empty">No matching members</div>}</section>;
}
