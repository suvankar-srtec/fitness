'use client';
import {useEffect,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
import {memberToday} from '../../lib/members.mjs';
import {matchesUserSearch} from '../../lib/user-search.mjs';
const clock=value=>value?new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(value)):'—';
const duration=value=>value===null?'—':`${Math.floor(value/60)}h ${value%60}m`;
export default function GymTimeReport(){
 const [range,setRange]=useState(()=>({from:memberToday(),to:memberToday()})),[query,setQuery]=useState(''),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setError('');requestApi('gym-time-report?'+new URLSearchParams(range)).then(data=>{if(active)setRows(data);}).catch(error=>{if(active){setError(error.message);setRows([]);}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[range]);
 const filtered=rows.filter(row=>matchesUserSearch(row,query));
 return <section aria-label="First In / Last Out report"><div className="gym-time-filters"><label>From<input type="date" value={range.from} onChange={e=>setRange({...range,from:e.target.value})}/></label><label>To<input type="date" value={range.to} onChange={e=>setRange({...range,to:e.target.value})}/></label><input type="search" aria-label="Search report members" placeholder="Search name, ID or phone" value={query} onChange={e=>setQuery(e.target.value)}/></div><p className="muted gym-time-note">Scan on arrival and departure. Time shown is the span between the first and last scans (IST).</p>{error&&<p role="alert" className="error">{error}</p>}<div className="panel tablewrap"><table><thead><tr><th>Date</th><th>Member ID</th><th>Name</th><th>Location</th><th>First In</th><th>Last Out</th><th>Time in gym</th><th>Status</th></tr></thead><tbody>{!loading&&filtered.map(row=><tr key={row.id}><td>{row.date.split('-').reverse().join(' ')}</td><td>{row.memberId}</td><td>{row.name}</td><td>{row.location||'—'}</td><td>{clock(row.firstIn)}</td><td>{clock(row.lastOut)}</td><td>{duration(row.minutes)}</td><td>{!row.firstIn?'Time not recorded':!row.lastOut?'Exit not scanned':'Recorded'}</td></tr>)}</tbody></table>{(loading||!filtered.length)&&<div className="empty" role="status">{loading?'Loading report…':'No matching records'}</div>}</div></section>;
}
