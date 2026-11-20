'use client';
import NavigationIcon from './NavigationIcon';
import {MessageNotice} from './MessagePopup';

import {useEffect,useState} from 'react';
import SupervisorScanner from './SupervisorScanner';
import AttendanceWorkspace from './AttendanceWorkspace';
import AccountActions from './AccountActions';
import SidebarLogout from './SidebarLogout';
import AppFooter from './AppFooter';
import GymBrand from './GymBrand';
import NavigationLogoCard from './NavigationLogoCard';
import MobileNavigation from './MobileNavigation';
import {requestApi} from '../../lib/api-client.mjs';
import {memberToday} from '../../lib/members.mjs';

function TaskIcon({name}){return <NavigationIcon name={name==='attendance'?'scan-report':name}/>;}
export default function SupervisorDashboard({user,onSignOut,error}){
 const [attendanceQuery,setAttendanceQuery]=useState('');
 const [summary,setSummary]=useState({totalMembers:0,joinedThisMonth:0});
 const [view,setView]=useState('dashboard'),[records,setRecords]=useState([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  if(view==='attendance')return;
  let current=true,pending=false,firstLoad=true;
  async function refresh(){
   if(pending||document.hidden)return;pending=true;const options={silent:!firstLoad};firstLoad=false;
   try{const date=memberToday();const [rows,totals]=await Promise.all([requestApi(`attendance?view=sheet&from=${date}&to=${date}`,'GET',undefined,options),requestApi('supervisor-summary','GET',undefined,options)]);if(current){setRecords(rows);setSummary(totals);setLoadError('');}}
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
 const employeeNavigation=(<nav className="supervisor-task-nav" aria-label="Supervisor navigation">{[['dashboard','Dashboard'],['scanner','Scan QR'],['attendance','Scan Report']].map(([key,label])=><button type="button" key={key} aria-current={view===key?'page':undefined} onClick={()=>setView(key)}><TaskIcon name={key}/><span>{label}</span></button>)}</nav>);
 return <div data-workspace-role="employee" className="app supervisor-focus-app"><aside className="sidebar"><MobileNavigation user={user} onSignOut={onSignOut}>{employeeNavigation}</MobileNavigation><div className="sidebar-identity"><GymBrand/><NavigationLogoCard user={user}/></div><AccountActions role={user.role} user={user} onSignOut={onSignOut} mobile/><div className="desktop-role-navigation">{employeeNavigation}</div><span className="nav-brand-credit">Powered by Digigraptek</span><SidebarLogout onSignOut={onSignOut}/></aside><main><header className="workspace-topbar supervisor-task-topbar"><h1>{view==='dashboard'?'Dashboard':view==='scanner'?'Scan member QR':'Scan Report'}</h1><span>{user.locationName?user.locationName+' / ':''}{dateLabel}</span><AccountActions role={user.role} user={user} onSignOut={onSignOut}/></header><div className="supervisor-task-heading">{view==='attendance'&&<input type="search" className="heading-attendance-search" aria-label="Search attendance members" placeholder="Search members" value={attendanceQuery} onChange={event=>setAttendanceQuery(event.target.value)}/>}</div>{error&&<MessageNotice>{error}</MessageNotice>}{view==='attendance'?<AttendanceWorkspace searchQuery={attendanceQuery}/>:<>{loadError&&<MessageNotice>{loadError}</MessageNotice>}<div className={'supervisor-daily-stats '+(view==='dashboard'?'supervisor-dashboard-stats':'supervisor-scanner-stats')} aria-label={view==='dashboard'?'Membership summary':'Today attendance'}>{stats.map(stat=><article data-card-surface="" key={stat.label} className={stat.label==='Present'?'attendance-present-text':stat.label==='Absent'?'attendance-absent-text':undefined}><span>{stat.label}</span><strong>{loading?'...':stat.value}</strong></article>)}</div><div className={'supervisor-scan-layout '+(view==='dashboard'?'supervisor-summary-layout':'')}>{view==='scanner'&&<section data-card-surface="" className="supervisor-scanner-station"><header><TaskIcon name="scanner"/><h2>Member check-in</h2></header><SupervisorScanner key={view} onAttendanceMarked={()=>setRefreshKey(value=>value+1)}/></section>}<section data-card-surface="" className="supervisor-today-list"><header><h2>Present today</h2><span className="badge">{present.length}</span></header>{present.length?<ul>{present.slice(0,5).map(member=><li key={member.member_id}><span className="supervisor-checkin-avatar" aria-hidden="true">{member.name?.trim().charAt(0).toUpperCase()}</span><div><strong>{member.name}</strong><span>{member.memberId}</span></div><span className="attendance-pill attendance-present">Present</span></li>)}</ul>:<div className="supervisor-no-checkins">{loading?'Loading attendance...':'No scans yet today'}</div>}</section></div></>}<AppFooter/></main></div>;
}
