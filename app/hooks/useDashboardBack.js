'use client';
import {useEffect,useRef} from 'react';
import {bindDashboardBack} from '../../lib/dashboard-back.mjs';
export default function useDashboardBack(active,onDashboard){
 const latest=useRef(onDashboard);latest.current=onDashboard;
 useEffect(()=>{if(!active)return;return bindDashboardBack(window,()=>latest.current());},[active]);
}
