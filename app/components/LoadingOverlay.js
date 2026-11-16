'use client';
import {useEffect,useState} from 'react';
import {pendingLoading} from '../../lib/loading-state.mjs';
export default function LoadingOverlay(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{let timer;const update=()=>{clearTimeout(timer);if(pendingLoading()>0)timer=setTimeout(()=>setVisible(true),250);else setVisible(false);};window.addEventListener('membership-loading',update);update();return()=>{clearTimeout(timer);window.removeEventListener('membership-loading',update);};},[]);
 return visible?<div className="global-loading-overlay" role="status" aria-live="polite"><div className="global-loading-card"><span className="global-loading-spinner" aria-hidden="true"/><span>Loading<span className="global-loading-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></span></div></div>:null;
}
