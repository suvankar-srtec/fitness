'use client';
import { useEffect } from 'react';
import { requestApi } from '../../lib/api-client.mjs';

export default function useProfileRefresh(userId,setProfile) {
 useEffect(()=>{
  if(!userId)return;
  let active=true,pending=false,lastRefresh=Date.now();
  async function refresh(force=false){
   if(!active||pending||document.hidden||(force!==true&&Date.now()-lastRefresh<45000))return;
   pending=true;lastRefresh=Date.now();
   try{const profile=await requestApi('me','GET',undefined,{silent:true});if(active)setProfile(previous=>{
    if(previous?.id!==userId||profile.id!==userId)return previous;
    return ['name','gymName','gymId','requiresLocationSelection','locationId','locationName','gymLogo','phone','email','role','userId'].some(key=>previous[key]!==profile[key])?{...previous,...profile}:previous;
   });}catch(error){if(active&&(error.status===401||['MEMBERSHIP_EXPIRED','MEMBER_INACTIVE','SUBSCRIPTION_EXPIRED'].includes(error.code)))setProfile(null);}finally{pending=false;}
  }
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('gym-user-updates'):null;
  if(channel)channel.onmessage=()=>refresh(true);
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const timer=setInterval(refresh,60000);
  return()=>{active=false;clearInterval(timer);channel?.close();window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[userId,setProfile]);
}
