'use client';
import {useEffect,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
export default function useAdminActivity(enabled){
 const [data,setData]=useState({scans:[],summary:null}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{if(!enabled)return;let active=true,pending=false;async function refresh(){if(!active||pending||document.hidden)return;pending=true;try{const result=await requestApi('admin-recent-activity');if(active){setData(result);setError('');}}catch(error){if(active)setError(error.message);}finally{pending=false;if(active)setLoading(false);}}refresh();const timer=setInterval(refresh,5000);window.addEventListener('gym-members-changed',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{active=false;clearInterval(timer);window.removeEventListener('gym-members-changed',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[enabled]);
 return {data,loading,error};
}
