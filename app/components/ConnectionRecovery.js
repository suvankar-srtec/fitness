'use client';
import {useEffect} from 'react';
import {requestApi} from '../../lib/api-client.mjs';

// Silently probe a safe GET before refreshing the mounted dashboard.
// Never reload the page or automatically repeat a payment or other write.
export default function ConnectionRecovery(){
 useEffect(()=>{
  let active=true,timer=null,pending=false,inFlight=false,attempts=0;
  const delays=[3000,8000,20000,45000,60000];
  const stopTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
  const schedule=delay=>{
   if(!active||timer!==null||inFlight||!navigator.onLine||document.hidden)return;
   timer=setTimeout(check,delay);
  };
  async function check(){
   timer=null;
   if(!active||!pending||inFlight||!navigator.onLine||document.hidden)return;
   inFlight=true;
   try{
    await requestApi('me','GET',undefined,{silent:true});
    if(!active)return;
    attempts=0;pending=false;
    window.dispatchEvent(new Event('gym-connection-retry'));
   }catch(error){
    if(!active)return;
    if(error?.status===401||error?.status===403){
     pending=false;attempts=0;
    }else{
     pending=true;
     attempts=Math.min(attempts+1,delays.length-1);
    }
   }finally{
    inFlight=false;
    if(active&&pending)schedule(delays[attempts]);
   }
  }
  const interrupted=()=>{
   pending=true;
   if(!inFlight)schedule(delays[attempts]);
  };
  const offline=()=>{pending=true;stopTimer();};
  const resume=()=>{
   if(!pending||!navigator.onLine||document.hidden)return;
   stopTimer();schedule(250);
  };
  window.addEventListener('gym-connection-issue',interrupted);
  window.addEventListener('offline',offline);
  window.addEventListener('online',resume);
  window.addEventListener('focus',resume);
  document.addEventListener('visibilitychange',resume);
  if(!navigator.onLine)offline();
  return()=>{
   active=false;stopTimer();
   window.removeEventListener('gym-connection-issue',interrupted);
   window.removeEventListener('offline',offline);
   window.removeEventListener('online',resume);
   window.removeEventListener('focus',resume);
   document.removeEventListener('visibilitychange',resume);
  };
 },[]);
 return null;
}
