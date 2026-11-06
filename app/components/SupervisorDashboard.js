'use client';
import {useEffect,useState} from 'react';
import SupervisorScanner from './SupervisorScanner';
import AttendanceWorkspace from './AttendanceWorkspace';
import GymBrand from './GymBrand';
import {requestApi} from '../../lib/api-client.mjs';
import {memberToday} from '../../lib/members.mjs';

function TaskIcon({name}){
 return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{name==='dashboard'?<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>:name==='scanner'?<><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 12h18"/><rect x="8" y="8" width="8" height="8" rx="1"/></>:<><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4m8-4v4M4 9h16m-12 4h2m4 0h2m-8 4h2m4 0h2"/></>}</svg>;
}
export default function SupervisorDashboard({user,onSignOut,error}){
 const [attendanceQuery,setAttendanceQuery]=useState('');
 const [summary,setSummary]=useState({totalMembers:0,joinedThisMonth:0});
 const [view,setView]=useState('dashboard'),[records,setRecords]=useState([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  if(view==='attendance')return;
  let current=true,pending=false;
  async function refresh(){
   if(pending||document.hidden)return;pending=true;
   try{const date=memberToday();const [rows,totals]=await Promise.all([requestApi(`attendance?view=sheet&from=${date}&to=${date}`),requestApi('supervisor-summary')]);if(current){setRecords(rows);setSummary(totals);setLoadError('');}}
   catch(error){if(current)setLoadError(error.message);}
   finally{pending=false;if(current)setLoading(false);}
  }
  refresh();const timer=setInterval(refresh,10000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('gym-attendance-updates'):null;if(channel)channel.onmessage=refresh;
  return()=>{current=false;clearInterval(timer);channel?.close();window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[view,refreshKey]);
 const present=records.filter(record=>record.status==='Present');
 const stats=view==='dashboard'?[{label:'Total Members',value:summary.totalMembers},{label:'Joined This Month',value:summary.joinedThisMonth}]:[{label:'Members today',value:records.length},{label:'Present',value:present.length},{label:'Absent',value:records.length-present.length}];
 const dateLabel=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(memberToday()+'T00:00:00Z'));
 return <div className="app supervisor-focus-app"><aside className="sidebar"><div className="sidebar-identity"><GymBrand name={user.gymName}/><span className="mobile-role-label">Supervisor</span></div><button type="button" className="logout-button mobile-header-logout" onClick={onSignOut}>Logout</button><nav className="supervisor-task-nav" aria-label="Supervisor navigation">{[['dashboard','Dashboard'],['scanner','Scan QR'],['attendance','Attendance Sheet']].map(([key,label])=><button type="button" key={key} aria-current={view===key?'page':undefined} onClick={()=>setView(key)}><TaskIcon name={key}/><span>{label}</span></button>)}</nav><footer><span className="pill">Supervisor</span></footer></aside><main><header className="workspace-topbar supervisor-task-topbar"><h1>{view==='dashboard'?'Dashboard':view==='scanner'?'Scan member QR':'Attendance Sheet'}</h1><span>{user.locationName?user.locationName+' / ':''}{dateLabel}</span><button type="button" className="logout-button" onClick={onSignOut}>Logout</button></header><div className="supervisor-task-heading">{view==='attendance'&&<input type="search" className="heading-attendance-search" aria-label="Search attendance members" placeholder="Search members" value={attendanceQuery} onChange={event=>setAttendanceQuery(event.target.value)}/>}</div>{error&&<p className="error" role="alert">{error}</p>}{view==='attendance'?<AttendanceWorkspace searchQuery={attendanceQuery}/>:<>{loadError&&<p className="error" role="alert">{loadError}</p>}<div className={'supervisor-daily-stats '+(view==='dashboard'?'supervisor-dashboard-stats':'supervisor-scanner-stats')} aria-label={view==='dashboard'?'Membership summary':'Today attendance'}>{stats.map(stat=><article key={stat.label} className={stat.label==='Present'?'attendance-present-text':stat.label==='Absent'?'attendance-absent-text':undefined}><span>{stat.label}</span><strong>{loading?'...':stat.value}</strong></article>)}</div><div className={'supervisor-scan-layout '+(view==='dashboard'?'supervisor-summary-layout':'')}>{view==='scanner'&&<section className="supervisor-scanner-station"><header><TaskIcon name="scanner"/><h2>Member check-in</h2></header><SupervisorScanner key={view} onAttendanceMarked={()=>setRefreshKey(value=>value+1)}/></section>}<section className="supervisor-today-list"><header><h2>Present today</h2><span className="badge">{present.length}</span></header>{present.length?<ul>{present.slice(0,5).map(member=><li key={member.member_id}><span className="supervisor-checkin-avatar" aria-hidden="true">{member.name?.trim().charAt(0).toUpperCase()}</span><div><strong>{member.name}</strong><span>{member.memberId}</span></div><span className="attendance-pill attendance-present">Present</span></li>)}</ul>:<div className="supervisor-no-checkins">{loading?'Loading attendance...':'No scans yet today'}</div>}</section></div></>}</main></div>;
}
