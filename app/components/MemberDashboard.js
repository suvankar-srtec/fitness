'use client';
import {useState} from 'react';
import CommerceIcon from './CommerceIcon';
import PaymentInfo from './PaymentInfo';
import Supplements from './Supplements';
import MemberTimeCalendar from './MemberTimeCalendar';
import VideoLibrary from './VideoLibrary';
import styles from './MemberDashboard.module.css';
function dateLabel(value){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(value||'');return m?`${m[3]}-${m[2]}-${m[1]}`:'-';}
function MenuIcon({name}){if(['payment','box','orders'].includes(name))return <CommerceIcon name={name}/>;return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{name==='overview'?<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>:name==='videos'?<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></>:<><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/><path d="M7 7h3v3H7zm7 0h3v3h-3zM7 14h3v3H7zm7 0h3v3h-3z"/></>}</svg>;}
const menus=[['overview','Overview'],['payment','Payments'],['box','Supplements'],['orders','Orders'],['videos','Videos'],['pass','My pass']];
export default function MemberDashboard({user,onSignOut}){
 const [service,setService]=useState('overview'),[attendance,setAttendance]=useState({days:0,month:'',loading:true});
 return <main className={styles.dashboard}>
 <header className={styles.header}><div className={styles.brand}><span className={styles.brandMark} aria-hidden="true">{user.gymLogo?<img src={user.gymLogo} alt=""/>:user.gymName?.trim().charAt(0)||'G'}</span><div><h1>{user.gymName||'Gym Management'}</h1></div></div><div className={styles.headerActions}><span className="account-role">Member</span><button type="button" className={styles.logout} onClick={onSignOut}>Logout</button></div></header>
 <div className={styles.workspace}>
 <nav className={styles.menu} aria-label="Member menu">{menus.map(([key,label])=><button type="button" key={key} aria-current={service===key?'page':undefined} onClick={()=>setService(key)}><MenuIcon name={key}/><span>{label}</span></button>)}</nav>
 <div className={styles.mainContent}><div className={styles.pageHeading}><h2>{menus.find(([key])=>key===service)?.[1]}</h2><span>{user.name}</span></div>
 {service==='overview'&&<><section className={styles.summary} aria-label="Membership summary"><article><span>Plan</span><strong>{user.plan||'No plan'}</strong></article><article><span>Validity</span><strong className={styles.validity}>{dateLabel(user.validFrom)} <span aria-hidden="true"> / </span>{dateLabel(user.validTo)}</strong></article><article><span>Days present{attendance.month?' / '+attendance.month.split('-').reverse().join('-'):''}</span><strong>{attendance.loading?'...':attendance.days}</strong></article></section><MemberTimeCalendar name={user.name} onAttendanceChange={setAttendance}/><section className={styles.videos}><div className={styles.sectionHeading}><span className={styles.sectionIcon}><MenuIcon name="videos"/></span><h2>Videos</h2></div><VideoLibrary/></section></>}
 {service==='payment'&&<PaymentInfo/>}
 {(service==='box'||service==='orders')&&<Supplements key={service} view={service==='orders'?'orders':'products'}/>}
 {service==='videos'&&<section className={styles.videos}><VideoLibrary/></section>}
 {service==='pass'&&<section className={styles.passView} id="member-pass"><img src="/api/member-pass" alt={`${user.name}'s gym pass`}/><div><strong>{user.plan}</strong><p>{dateLabel(user.validFrom)} / {dateLabel(user.validTo)}</p>{user.gymPhone&&<a href={'tel:'+user.gymPhone}>Contact gym</a>}</div></section>}
 </div></div></main>;
}
