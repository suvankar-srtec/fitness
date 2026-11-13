'use client';
import {MessageNotice} from './MessagePopup';

import {useEffect,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
const operations={INSERT:'Created',UPDATE:'Updated',DELETE:'Deleted',EXISTING:'Existing record',SEND_ACCEPTED:'Message accepted',SEND_FAILED:'Message failed',SEND_UNKNOWN:'Delivery unconfirmed'};
const dateFormat=new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'});
export default function AuditReport(){
 const [records,setRecords]=useState([]),[cursor,setCursor]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let current=true;
  requestApi('audit').then(data=>{if(current){setRecords(data.records);setCursor(data.nextCursor);}}).catch(error=>{if(current)setError(error.message);}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;};
 },[]);
 async function more(){if(busy||!cursor)return;setBusy(true);setError('');try{const data=await requestApi('audit?'+new URLSearchParams({cursor}));setRecords(previous=>[...new Map([...previous,...data.records].map(record=>[record.id,record])).values()]);setCursor(data.nextCursor);}catch(error){setError(error.message);}finally{setBusy(false);}}
 return <section className="audit-report" aria-label="Audit Report">{error&&<MessageNotice>{error}</MessageNotice>}<div className="audit-sheet-scroll" tabIndex={0} role="region" aria-label="Audit records spreadsheet"><table className="audit-sheet"><thead><tr><th scope="col">Date &amp; Time</th><th scope="col">Activity</th><th scope="col">Action</th><th scope="col">Gym</th><th scope="col">Performed By</th></tr></thead><tbody>{records.map(record=><tr key={record.id}><td>{dateFormat.format(new Date(record.occurred_at))}</td><td>{record.entity}</td><td>{operations[record.operation]||record.operation}</td><td>{record.gym_name||'-'}</td><td>{record.actor_name}{record.actor_user_id?' ('+record.actor_user_id+')':''}</td></tr>)}{!records.length&&<tr><td colSpan={5}>{loading?'Loading...':error?'Unable to load audit records':'No audit records'}</td></tr>}</tbody></table></div>{cursor&&!loading&&<button type="button" className="secondary audit-load-more" disabled={busy} onClick={more}>{busy?'Loading...':'Load more'}</button>}</section>;
}
