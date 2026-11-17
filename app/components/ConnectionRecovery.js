'use client';
import {useEffect,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';

// Keep current dashboard data mounted; only the user can choose to reload.
export default function ConnectionRecovery(){
 const [problem,setProblem]=useState(null);
 const [retrying,setRetrying]=useState(false);
 useEffect(()=>{
  const onIssue=event=>setProblem(previous=>previous||{reason:event.detail?.reason||'NETWORK_ERROR'});
  const offline=()=>setProblem({reason:'OFFLINE'});
  const online=()=>setProblem(previous=>previous?{reason:'RECONNECTED'}:null);
  window.addEventListener('gym-connection-issue',onIssue);
  window.addEventListener('offline',offline);
  window.addEventListener('online',online);
  if(!navigator.onLine)offline();
  return()=>{
   window.removeEventListener('gym-connection-issue',onIssue);
   window.removeEventListener('offline',offline);
   window.removeEventListener('online',online);
  };
 },[]);
 async function retry(){
  if(retrying)return;
  setRetrying(true);
  try{
   // Check the server first. A failed GET does not submit or repeat any mutations.
   await requestApi('me','GET',undefined,{silent:true});
   setProblem(null);
   window.dispatchEvent(new Event('gym-connection-retry'));
  }catch(error){
   if(error.status===401){
    // Session handling is owned by the existing authentication flow.
    setProblem(null);
   }else{
    setProblem({reason:error.code||'NETWORK_ERROR'});
   }
  }finally{setRetrying(false);}
 }
 function safeReload(){
  // Do not discard in-progress forms without explicit approval.
  if(window.confirm('Reload the app? Unsaved form entries will be lost.'))window.location.reload();
 }
 if(!problem)return null;
 const offline=problem.reason==='OFFLINE'||!navigator.onLine;
 return <aside className="gym-connection-recovery" role="status" aria-live="polite">
  <span className="gym-connection-symbol" aria-hidden="true">!</span>
  <div className="gym-connection-copy">
   <strong>{offline?'You are offline':'Connection interrupted'}</strong>
   <p>{offline?'Check your internet connection.':'Some information could not be refreshed.'} Previously loaded data remains on screen.</p>
   <div className="gym-connection-actions">
    <button type="button" onClick={retry} disabled={retrying||offline}>{retrying?'Checking…':'Retry'}</button>
    <button type="button" className="gym-reload-action" onClick={safeReload}>Reload</button>
    <button type="button" className="gym-dismiss-action" onClick={()=>setProblem(null)} aria-label="Dismiss connection message">Dismiss</button>
   </div>
  </div>
 </aside>;
}
