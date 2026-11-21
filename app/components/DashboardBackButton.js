'use client';
export default function DashboardBackButton({onClick,className=''}){
 return <button type="button" className={'secondary dashboard-back-button '+className} onClick={()=>{onClick?.();window.dispatchEvent(new Event('membership-dashboard'));}}><span aria-hidden="true">&larr;</span> Back to dashboard</button>;
}
