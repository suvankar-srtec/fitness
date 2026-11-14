'use client';
import {useEffect,useState} from 'react';
import AccountActions from './AccountActions';
import CommerceIcon from './CommerceIcon';
import PaymentInfo from './PaymentInfo';
import Supplements from './Supplements';
import MemberTimeCalendar from './MemberTimeCalendar';
import VideoLibrary from './VideoLibrary';
import styles from './MemberDashboard.module.css';
import {requestApi} from '../../lib/api-client.mjs';
function dateLabel(value){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(value||'');return m?`${m[3]}-${m[2]}-${m[1]}`:'-';}
function MenuIcon({name}){if(['payment','box','orders'].includes(name))return <CommerceIcon name={name}/>;return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{name==='overview'?<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>:name==='videos'?<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></>:<><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/><path d="M7 7h3v3H7zm7 0h3v3h-3zM7 14h3v3H7zm7 0h3v3h-3z"/></>}</svg>;}
const menus=[['overview','Overview'],['payment','Payments'],['box','Supplements'],['orders','Orders'],['videos','Videos'],['pass','My pass']];
export default function MemberDashboard({user,onSignOut}){
 const [paymentData,setPaymentData]=useState(null);
 const daysLeft=Math.ceil((Date.parse(String(user.validTo).slice(0,10)+'T00:00:00Z')-Date.parse(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())+'T00:00:00Z'))/86400000);
 const [renewalOpen,setRenewalOpen]=useState(daysLeft>=0&&daysLeft<=7);
 useEffect(()=>{let active=true;const timer=setTimeout(()=>{requestApi('payment-info').then(value=>{if(active)setPaymentData(value);}).catch(()=>{});},600);return()=>{active=false;clearTimeout(timer);};},[user.id]);
 const [service,setService]=useState('overview'),[attendance,setAttendance]=useState({days:0,month:'',loading:true});
 const [passImage,setPassImage]=useState(''),[passError,setPassError]=useState(''),[passRetry,setPassRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let active=true,objectUrl;
  setPassImage('');setPassError('');
  const timer=setTimeout(async()=>{
   try{
    const response=await fetch('/api/member-pass',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('Unable to load your pass. Please retry.');
    const blob=await response.blob();if(!active)return;
    objectUrl=URL.createObjectURL(blob);
    const image=new Image();image.src=objectUrl;await image.decode();
    if(active)setPassImage(objectUrl);
   }catch(error){if(active&&error.name!=='AbortError')setPassError('Unable to load your pass. Please retry.');}
  },300);
  return()=>{active=false;clearTimeout(timer);controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[user.id,user.validFrom,user.validTo,user.plan,user.name,user.gymLogo,passRetry]);
 return <main className={styles.dashboard+(service==='pass'?' '+styles.passDashboard:'')}>
 <header className={styles.header}><div className={styles.brand}><span className={styles.brandMark} aria-hidden="true">{user.gymLogo?<img src={user.gymLogo} alt=""/>:user.gymName?.trim().charAt(0)||'G'}</span><div><h1>{user.gymName||'Membership Management System'}</h1></div></div><AccountActions role="member" user={user} onSignOut={onSignOut}/></header>
 {renewalOpen&&<div className="modal-overlay"><section className="modal-card renewal-notice" role="dialog" aria-modal="true" aria-labelledby="renewal-title"><h2 id="renewal-title">Membership renewal</h2><p>Your plan expires on {dateLabel(user.validTo)}. Please contact your organization to renew.</p>{user.gymPhone&&<a href={'tel:'+user.gymPhone}>Contact: {user.gymPhone}</a>}<button type="button" onClick={()=>setRenewalOpen(false)}>OK</button></section></div>}<div className={styles.workspace}>
 <nav className={styles.menu} aria-label="Member menu">{menus.map(([key,label])=><button type="button" key={key} title={label} aria-label={label} aria-current={service===key?'page':undefined} onClick={()=>setService(key)}><MenuIcon name={key}/><span>{label}</span></button>)}</nav>
 <div className={styles.mainContent}><div className={styles.pageHeading}><h2>{menus.find(([key])=>key===service)?.[1]}</h2></div>
 {service==='overview'&&<><section className={styles.summary} aria-label="Membership summary"><article><span>Plan</span><strong>{user.plan||'No plan'}</strong></article><article><span>Validity</span><strong className={styles.validity}>{dateLabel(user.validFrom)} <span aria-hidden="true"> / </span>{dateLabel(user.validTo)}</strong></article><article><span>Days present{attendance.month?' / '+new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(attendance.month+'-01T00:00:00Z')):''}</span><strong>{attendance.loading?'...':attendance.days}</strong></article></section><MemberTimeCalendar name={user.name} onAttendanceChange={setAttendance}/><section className={styles.videos}><div className={styles.sectionHeading}><span className={styles.sectionIcon}><MenuIcon name="videos"/></span><h2>Videos</h2></div><VideoLibrary/></section></>}
 {service==='payment'&&<PaymentInfo initialData={paymentData} onData={setPaymentData}/>}
 {(service==='box'||service==='orders')&&<Supplements key={service} view={service==='orders'?'orders':'products'}/>}
 {service==='videos'&&<section className={styles.videos}><VideoLibrary/></section>}
 {service==='pass'&&<section className={styles.passView} id="member-pass">{passImage?<img src={passImage} alt={`${user.name}'s organization pass`}/>:<div role="status">{passError?<><p>{passError}</p><button type="button" onClick={()=>setPassRetry(value=>value+1)}>Retry</button></>:'Loading your pass…'}</div>}<div className={styles.passMetadata}><strong>{user.plan}</strong><p>{dateLabel(user.validFrom)} / {dateLabel(user.validTo)}</p>{user.gymPhone&&<a href={'tel:'+user.gymPhone}>Contact organization</a>}</div></section>}
 </div></div></main>;
}
