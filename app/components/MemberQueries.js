"use client";
import {useEffect,useRef,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
import {MessageNotice} from './MessagePopup';
import styles from './MemberQueries.module.css';
export default function MemberQueries({role,onClose,onRead}){
 const dialog=useRef(null),[rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(role==='admin'),[sent,setSent]=useState(false);
 useEffect(()=>{const el=dialog.current;el.showModal();let active=true;if(role==='admin')requestApi('member-queries').then(data=>{if(active)setRows(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;el.close();};},[role]);
 async function send(e){e.preventDefault();if(busy)return;setBusy(true);setError('');try{await requestApi('member-queries','POST',{message:new FormData(e.currentTarget).get('message')});setSent(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function read(id){if(busy)return;setBusy(true);try{await requestApi('member-queries','PATCH',{id});setRows(old=>old.map(r=>r.id===id?{...r,read_at:new Date().toISOString()}:r));onRead?.();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <dialog ref={dialog} className={styles.dialog} aria-labelledby="query-title" onCancel={e=>{e.preventDefault();onClose();}}><header><h2 id="query-title">Query</h2><button type="button" aria-label="Close" onClick={onClose}>?</button></header><MessageNotice>{error}</MessageNotice>{role==='member'?(sent?<p role="status">Query sent</p>:<form onSubmit={send}><label htmlFor="member-query">Message</label><textarea id="member-query" name="message" rows={5} maxLength={2000} required/><footer><button disabled={busy}>{busy?'Sending?':'Send'}</button></footer></form>):loading?<p>Loading?</p>:rows.length?<div className={styles.list}>{rows.map(r=><article key={r.id}><div><strong>{r.name}</strong><small>{new Date(r.created_at).toLocaleString('en-GB')}</small></div><p>{r.message}</p>{!r.read_at&&<button disabled={busy} onClick={()=>read(r.id)}>Mark read</button>}</article>)}</div>:<p>No queries</p>}</dialog>;
}
