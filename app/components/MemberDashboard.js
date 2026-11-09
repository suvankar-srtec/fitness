'use client';
import MemberTimeCalendar from './MemberTimeCalendar';
import VideoLibrary from './VideoLibrary';
import styles from './MemberDashboard.module.css';

function dateLabel(value){
 const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(value||'');
 return match?`${match[3]}-${match[2]}-${match[1]}`:'Not set';
}
function PassIcon(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/><path d="M7 7h3v3H7zm7 0h3v3h-3zM7 14h3v3H7zm7 0h3v3h-3z"/></svg>;}
export default function MemberDashboard({user,onSignOut}){
 return <main className={styles.dashboard}>
  <header className={styles.header}><div className={styles.brand}><span className={styles.brandMark} aria-hidden="true">{user.gymLogo?<img src={user.gymLogo} alt=""/>:user.gymName?.trim().charAt(0)||'G'}</span><div><h1>{user.gymName||'Gym Management'}</h1></div></div><div className={styles.headerActions}><span className="account-role">Member</span><button type="button" className={styles.logout} onClick={onSignOut}>Logout</button></div></header>
  <section className={styles.summary} aria-label="Membership summary"><article><span>Current plan</span><strong>{user.plan||'No plan'}</strong></article><article><span>Valid from</span><strong>{dateLabel(user.validFrom)}</strong></article><article><span>Valid until</span><strong>{dateLabel(user.validTo)}</strong></article></section>
  <MemberTimeCalendar name={user.name}/>
  <div className={styles.content}>
   <section className={styles.videos}><div className={styles.sectionHeading}><span className={styles.sectionIcon} aria-hidden="true">▷</span><h2>Gym videos</h2></div><VideoLibrary/></section>
   <aside className={styles.passPanel} id="member-pass"><div className={styles.passHeading}><span className={styles.qrIcon}><PassIcon/></span><div><h2>Member pass</h2><p>Your QR for gym check-in</p></div></div><details className={styles.passDetails}><summary>Show QR pass<span aria-hidden="true">＋</span></summary><img src="/api/member-pass" alt={`${user.name}'s gym QR pass`} loading="lazy"/></details><div className={styles.renewal}><span>Membership renewal</span><p>Renew on or before <strong>{dateLabel(user.validTo)}</strong>.</p>{user.gymPhone&&<a href={'tel:'+user.gymPhone}>Contact gym <span aria-hidden="true">↗</span></a>}</div></aside>
  </div>
 </main>;
}
