'use client';
import {useEffect,useRef} from 'react';

// A single immediate change event should not start multiple full workspace
// reads (for example when several components listen to the same update).
export default function useWorkspaceRefresh(enabled,refresh){
 const latest=useRef(refresh);latest.current=refresh;
 useEffect(()=>{
  if(!enabled)return;
  let active=true,pending=false,lastRefresh=Date.now(),needsRefresh=false;
  async function update(event){
   if(!active||document.hidden)return;
   const force=event?.type==='gym-data-changed'||event?.type==='gym-members-changed'||event?.type==='gym-connection-retry'||event?.type==='message';
   const now=Date.now();
   if(!force&&now-lastRefresh<60000)return;
   if(pending){if(force)needsRefresh=true;return;}
   pending=true;lastRefresh=now;
   try{await latest.current({silent:true});}catch{}
   finally{
    pending=false;
    if(active&&needsRefresh){
     needsRefresh=false;
     // Let the mutation-triggered refresh happen after the active read.
     queueMicrotask(()=>{if(active)update({type:'gym-data-changed'});});
    }
   }
  }
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('gym-data-updates'):null;
  if(channel)channel.onmessage=update;
  const timer=setInterval(update,60000);
  window.addEventListener('gym-data-changed',update);
  window.addEventListener('gym-members-changed',update);
  window.addEventListener('gym-connection-retry',update);
  window.addEventListener('focus',update);
  document.addEventListener('visibilitychange',update);
  return()=>{
   active=false;clearInterval(timer);channel?.close();
   window.removeEventListener('gym-data-changed',update);
   window.removeEventListener('gym-members-changed',update);
   window.removeEventListener('gym-connection-retry',update);
   window.removeEventListener('focus',update);
   document.removeEventListener('visibilitychange',update);
  };
 },[enabled]);
}
