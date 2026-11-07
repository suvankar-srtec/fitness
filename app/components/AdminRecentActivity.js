'use client';
import {useEffect,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
const time=value=>value?new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',day:'2-digit',month:'short',timeZone:'Asia/Kolkata'}).format(new Date(value)):'Not scanned';
export default function AdminRecentActivity({data,loading,error}){
 return <section className="admin-recent-activity" aria-label="Recent QR scans">{error&&<p role="alert" className="error">{error}</p>}<article className="admin-activity-panel"><header><h2>Latest 10 QR scans</h2></header><div className="tablewrap"><table><thead><tr><th>Member</th><th>Location</th><th>Scan time (IST)</th><th>Status</th><th>Result</th></tr></thead><tbody>{data.scans.map(row=><tr key={String(row.id)}><td><strong>{row.name||'Unrecognized QR'}</strong>{row.memberId&&<small>{row.memberId}</small>}</td><td>{row.location||'?'}</td><td>{time(row.scannedAt)}</td><td><span className={'attendance-pill '+(row.result==='Accepted'?'attendance-present':'attendance-absent')}>{row.result}</span></td><td>{row.reason}</td></tr>)}</tbody></table>{!data.scans.length&&<div className="empty">{loading?'Loading?':'No QR scans recorded yet'}</div>}</div></article></section>;
}
