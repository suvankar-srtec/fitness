'use client';
import {useEffect,useState} from 'react';
import {pendingLoading} from '../../lib/loading-state.mjs';
// A progress indicator must never cover, disable or trap the dashboard.
export default function LoadingOverlay(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  let showTimer,hideTimer,active=false;
  const update=()=>{
   if(pendingLoading()===0){
    active=false;clearTimeout(showTimer);clearTimeout(hideTimer);setVisible(false);
   }else if(!active){
    active=true;
    showTimer=setTimeout(()=>setVisible(true),350);
    hideTimer=setTimeout(()=>setVisible(false),7000);
   }
  };
  window.addEventListener('membership-loading',update);
  update();
  return()=>{clearTimeout(showTimer);clearTimeout(hideTimer);window.removeEventListener('membership-loading',update);};
 },[]);
 return visible?<div className="global-loading-nonblocking" role="status" aria-live="polite"><span className="global-loading-spinner" aria-hidden="true"/>Loading…</div>:null;
}
