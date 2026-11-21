'use client';
import useDashboardBack from '../hooks/useDashboardBack';
import NavigationIcon from './NavigationIcon';
import {useEffect,useState} from 'react';
import AccountActions from './AccountActions';
import SidebarLogout from './SidebarLogout';
import AppFooter from './AppFooter';
import GymBrand from './GymBrand';
import NavigationLogoCard from './NavigationLogoCard';
import Announcements from './Announcements';
import MobileNavigation from './MobileNavigation';

import PaymentInfo from './PaymentInfo';
import Supplements from './Supplements';
import MemberTimeCalendar from './MemberTimeCalendar';
import VideoLibrary from './VideoLibrary';
import styles from './MemberDashboard.module.css';
import {beginLoading} from '../../lib/loading-state.mjs';
import {requestApi} from '../../lib/api-client.mjs';
function dateLabel(value){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(value||'');return m?`${m[3]}-${m[2]}-${m[1]}`:'-';}
function MenuIcon({name}){return <NavigationIcon name={name}/>;}
const menus=[['overview','Overview'],['payment','Payments'],['box','Supplements'],['orders','Orders'],['videos','Videos'],['pass','My pass']];
export default function MemberDashboard({user,onSignOut}){
 const [paymentData,setPaymentData]=useState(null);
 const daysLeft=Math.ceil((Date.parse(String(user.validTo).slice(0,10)+'T00:00:00Z')-Date.parse(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T00:00:00Z'))/86400000);
 const [renewalOpen,setRenewalOpen]=useState(daysLeft>=0&&daysLeft<=7);
 useEffect(()=>{let active=true;const timer=setTimeout(()=>{requestApi('payment-info','GET',undefined,{silent:true}).then(value=>{if(active)setPaymentData(value);}).catch(()=>{});},600);return()=>{active=false;clearTimeout(timer);};},[user.id]);
 const [service,setService]=useState('overview'),[attendance,setAttendance]=useState({days:0,month:'',loading:true});
 useDashboardBack(service!=='overview',()=>{setService('overview');});
 const [passImage,setPassImage]=useState(''),[passError,setPassError]=useState(''),[passRetry,setPassRetry]=useState(0);
 useEffect(()=>{
  if(service!=='pass')return;
  const controller=new AbortController();let active=true,objectUrl;
  setPassImage('');setPassError('');
  const timer=setTimeout(async()=>{
   const done=beginLoading();
   try{
    const response=await fetch('/api/member-pass',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('Unable to load your pass. Please retry.');
    const blob=await response.blob();if(!active)return;
    objectUrl=URL.createObjectURL(blob);
    const image=new Image();image.src=objectUrl;await image.decode();
    if(active)setPassImage(objectUrl);
   }catch(error){if(active&&error.name!=='AbortError')setPassError('Unable to load your pass. Please retry.');}finally{done();}
  },300);
  return()=>{active=false;clearTimeout(timer);controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[user.id,user.validFrom,user.validTo,user.plan,user.name,user.gymLogo,passRetry,service]);
 const memberNavigation=(<nav className="sidebar-actions" aria-label="Member menu">{menus.map(([key,label])=><button type="button" className="dashboard-nav" key={key} title={label} aria-label={label} aria-current={service===key?'page':undefined} onClick={()=>setService(key)}><MenuIcon name={key}/><span>{label}</span></button>)}</nav>);
 return <div data-workspace-role="member" className="app management-app member-workspace"><aside className="sidebar"><MobileNavigation user={user} onSignOut={onSignOut}>{memberNavigation}</MobileNavigation><div className="sidebar-identity"><GymBrand/><NavigationLogoCard user={user}/></div><div className="management-nav-wrap">{memberNavigation}</div><span className="nav-brand-credit">Powered by Digigraptek</span><SidebarLogout onSignOut={onSignOut}/></aside><main className={styles.dashboard+(service==='pass'?' '+styles.passDashboard:'')}>
 <header className="workspace-topbar"><h1>{menus.find(([key])=>key===service)?.[1]}</h1><AccountActions role="member" user={user} onSignOut={onSignOut}/></header>
 {renewalOpen&&<div className="modal-overlay"><section className="modal-card renewal-notice" role="dialog" aria-modal="true" aria-labelledby="renewal-title"><h2 id="renewal-title">Membership renewal</h2><p>Your plan expires on {dateLabel(user.validTo)}. Please contact your organization to renew.</p>{user.gymPhone&&<a href={'tel:'+user.gymPhone}>Contact: {user.gymPhone}</a>}<button type="button" onClick={()=>setRenewalOpen(false)}>OK</button></section></div>}<div className={styles.workspace+' member-content'}>

 <div className={styles.mainContent}>
 {service==='overview'&&<><section className={styles.summary} aria-label="Membership summary"><article data-card-surface=""><span>Plan</span><strong>{user.plan||'No plan'}</strong></article><article data-card-surface=""><span>Validity</span><strong className={styles.validity}>{dateLabel(user.validFrom)} <span aria-hidden="true"> / </span>{dateLabel(user.validTo)}</strong></article><article data-card-surface=""><span>Days present{attendance.month?' / '+new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(attendance.month+'-01T00:00:00Z')):''}</span><strong>{attendance.loading?'...':attendance.days}</strong></article></section><Announcements user={user} readOnly/><MemberTimeCalendar name={user.name} onAttendanceChange={setAttendance}/><section data-card-surface="" className={styles.videos}><div className={styles.sectionHeading}><span className={styles.sectionIcon}><MenuIcon name="videos"/></span><h2>Videos</h2></div><VideoLibrary/></section></>}
 {service==='payment'&&<PaymentInfo initialData={paymentData} onData={setPaymentData}/>}
 {(service==='box'||service==='orders')&&<Supplements key={service} view={service==='orders'?'orders':'products'}/>}
 {service==='videos'&&<section data-card-surface="" className={styles.videos}><VideoLibrary/></section>}
 {service==='pass'&&<section data-card-surface="" className={styles.passView} id="member-pass">{passImage?<img src={passImage} alt={`${user.name}'s organization pass`}/>:<div role="status">{passError?<><p>{passError}</p><button type="button" onClick={()=>setPassRetry(value=>value+1)}>Retry</button></>:'Loading your pass…'}</div>}<div className={styles.passMetadata}><strong>{user.plan}</strong><p>{dateLabel(user.validFrom)} / {dateLabel(user.validTo)}</p>{user.gymPhone&&<a href={'tel:'+user.gymPhone}>Contact organization</a>}</div></section>}
 </div></div><AppFooter/></main></div>;
}
