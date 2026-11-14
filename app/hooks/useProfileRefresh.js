'use client';
import { useEffect } from 'react';
import { requestApi } from '../../lib/api-client.mjs';

export default function useProfileRefresh(userId,setProfile) {
 useEffect(()=>{
  if(!userId)return;
  let active=true,pending=false;
  async function refresh(){
   if(!active||pending||document.hidden)return;
   pending=true;
   try{const profile=await requestApi('me');if(active)setProfile(previous=>{
    if(previous?.id!==userId||profile.id!==userId)return previous;
    return ['name','gymName','gymId','requiresLocationSelection','locationId','locationName','gymLogo','phone','email','role','userId'].some(key=>previous[key]!==profile[key])?{...previous,...profile}:previous;
   });}catch(error){if(active&&(error.status===401||['MEMBERSHIP_EXPIRED','MEMBER_INACTIVE'].includes(error.code)))setProfile(null);}finally{pending=false;}
  }
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('gym-user-updates'):null;
  if(channel)channel.onmessage=refresh;
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  const timer=setInterval(refresh,15000);
  return()=>{active=false;clearInterval(timer);channel?.close();window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[userId,setProfile]);
}
