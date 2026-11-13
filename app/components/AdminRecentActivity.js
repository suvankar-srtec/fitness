'use client';
import {MessageNotice} from './MessagePopup';

import {useEffect,useState} from 'react';
import {memberToday} from '../../lib/members.mjs';
const time=value=>value?new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',day:'2-digit',month:'short',timeZone:'Asia/Kolkata'}).format(new Date(value)):'Not scanned';
export default function AdminRecentActivity({data,loading,error}){
 const [date,setDate]=useState('');
 useEffect(()=>{const update=()=>setDate(memberToday());update();const timer=setInterval(update,60000);return()=>clearInterval(timer);},[]);
 return <section className="admin-recent-activity" aria-label="Recent QR scans">{error&&<MessageNotice>{error}</MessageNotice>}<article className="admin-activity-panel"><header><h2>Latest 10 QR scans</h2><time className="recent-scans-date" dateTime={date}>{date?date.split('-').reverse().join('-'):''}</time></header><div className="tablewrap"><table><thead><tr><th>Scan time (IST)</th><th>Member</th><th>Gym Location</th><th>Status</th></tr></thead><tbody>{data.scans.map(row=><tr key={String(row.id)}><td>{time(row.scannedAt)}</td><td><div className="recent-scan-person"><span className="recent-scan-photo">{row.photoUrl?<img src={row.photoUrl} alt="" loading="lazy"/>:row.name?.charAt(0).toUpperCase()||'?'}</span><div><strong>{row.name||'Unrecognized QR'}</strong>{row.memberId&&<small>{row.memberId}</small>}</div></div></td><td>{row.location||'?'}</td><td><span className={'attendance-pill '+(row.result==='Accepted'?'attendance-present':'attendance-absent')}>{row.result}</span></td></tr>)}</tbody></table>{!data.scans.length&&<div className="empty">{loading?'Loading...':'No QR scans recorded yet'}</div>}</div></article></section>;
}
