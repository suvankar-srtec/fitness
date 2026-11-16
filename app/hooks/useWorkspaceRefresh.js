'use client';
import {useEffect,useRef} from 'react';
export default function useWorkspaceRefresh(enabled,refresh){
 const latest=useRef(refresh);latest.current=refresh;
 useEffect(()=>{
  if(!enabled)return;
  let active=true,pending=false,lastRefresh=0;
  async function update(event){if(!active||pending||document.hidden)return;const force=event?.type==='gym-data-changed'||event?.type==='message';if(!force&&Date.now()-lastRefresh<10000)return;pending=true;lastRefresh=Date.now();try{await latest.current({silent:true});}catch{}finally{pending=false;}}
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('gym-data-updates'):null;
  if(channel)channel.onmessage=update;
  const timer=setInterval(update,30000);
  window.addEventListener('gym-data-changed',update);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{active=false;clearInterval(timer);channel?.close();window.removeEventListener('gym-data-changed',update);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
 },[enabled]);
}
