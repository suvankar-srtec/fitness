'use client';
import {useEffect,useState} from 'react';
export default function DashboardBackButton({onClick,className=''}){
 const [native,setNative]=useState(false);
 useEffect(()=>{setNative(/MembershipAndroid\/|MembershipIOS\//.test(navigator.userAgent));},[]);
 if(!native)return null;
 return <button type="button" className={'secondary dashboard-back-button '+className} onClick={()=>{onClick?.();window.dispatchEvent(new Event('membership-dashboard'));}}><span aria-hidden="true">&larr;</span> Back to dashboard</button>;
}
