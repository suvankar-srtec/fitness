'use client';
import {useEffect,useState} from 'react';
import LocationCollections from './LocationCollections';
import MemberTimeCalendar from './MemberTimeCalendar';
import {requestApi} from '../../lib/api-client.mjs';
import {managerAnalytics} from '../../lib/manager-analytics.mjs';
function Pie({pie}){
 const ratio=pie.total?pie.present/pie.total:0;
 const x=100+80*Math.sin(ratio*2*Math.PI),y=100-80*Math.cos(ratio*2*Math.PI);
 return <svg viewBox="0 0 200 200" role="img" aria-label={pie.present+' present, '+pie.absent+' absent'}><circle cx="100" cy="100" r="80" fill="var(--gym-soft, #e5e5e5)"/>{ratio===1?<circle cx="100" cy="100" r="80" fill="var(--gym-accent, #111111)"/>:ratio>0&&<path d={'M100 100 L100 20 A80 80 0 '+(ratio>.5?1:0)+' 1 '+x+' '+y+' Z'} fill="var(--gym-accent, #111111)"/>}{!pie.total&&<text x="100" y="105" textAnchor="middle" fontSize="14">No records</text>}</svg>;
}
function Bars({bars}){
 const max=Math.max(1,...bars.map(bar=>bar.count));
 return <svg viewBox="0 0 520 230" role="img" aria-label="Daily member check-ins for the last seven days"><path d="M20 190H510" stroke="#cccccc"/>{bars.map((bar,index)=>{const height=bar.count/max*145,x=35+index*68;return <g key={bar.date}><rect x={x} y={190-height} width="34" height={Math.max(1,height)} rx="4" fill="var(--gym-accent, #111111)"><title>{bar.date+': '+bar.count+' present'}</title></rect><text x={x+17} y={180-height} textAnchor="middle" fontSize="14">{bar.count}</text><text x={x+17} y="215" textAnchor="middle" fontSize="14">{bar.date.slice(8)+'/'+bar.date.slice(5,7)}</text></g>;})}</svg>;
}

export default function ManagerOverview({user,supervisors=[]}){
 const [collections,setCollections]=useState([]),[data,setData]=useState(null),[selected,setSelected]=useState('all'),[error,setError]=useState('');
 useEffect(()=>{let active=true,pending=false;async function refresh(){if(!active||pending||document.hidden)return;pending=true;try{const [result,payments]=await Promise.all([requestApi('manager-dashboard'),requestApi('membership-payments')]);if(active){setCollections(payments);setData(result);setError('');}}catch(error){if(active)setError(error.message);}finally{pending=false;}}refresh();const timer=setInterval(refresh,5000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[user.id,user.locationId]);
 const analytics=data?managerAnalytics(data,selected):null;
 return <div className="manager-overview"><div className="manager-overview-heading">{user.locationName&&<span className="manager-assigned-location" aria-label="Assigned location"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>{user.locationName}</span>}<select className="manager-member-select" aria-label="Chart member" value={selected} onChange={event=>setSelected(event.target.value)}><option value="all">All members</option>{data?.members.map(member=><option value={member.id} key={member.id}>{member.name} ({member.memberId})</option>)}</select></div>{error&&<p className="error" role="alert">{error}</p>}{analytics?<><div className="manager-summary-stats">{[['Members',analytics.totalMembers],['Joined this month',analytics.joinedThisMonth],['Present today',analytics.presentToday],['Supervisors',supervisors.length]].map(([label,count])=><article key={label}><span>{label}</span><strong>{count}</strong></article>)}</div><LocationCollections payments={collections}/>{analytics.member&&<MemberTimeCalendar key={analytics.member.id} memberId={analytics.member.id} name={analytics.member.name}/>}<div className="manager-charts"><section className="panel manager-chart"><h2>{analytics.member?analytics.member.name+': Attendance (30 days)':"Today's attendance"}</h2><Pie pie={analytics.pie}/><div className="manager-chart-legend"><span><i/>Present: {analytics.pie.present}</span><span><i/>Absent: {analytics.pie.absent}</span></div></section><section className="panel manager-chart"><h2>Daily check-ins (last 7 days)</h2><Bars bars={analytics.bars}/></section></div></>:!error&&<div className="loading">Loading dashboard...</div>}</div>;
}
