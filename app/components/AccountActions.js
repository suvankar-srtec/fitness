 'use client';
import {useEffect,useRef,useState} from 'react';
import StaffQrButton from './StaffQrButton';
import AdminAccountDetails from './AdminAccountDetails';
import styles from './AdminAccountDetails.module.css';
export default function AccountActions({role,user={},onSignOut,mobile=false}){
 const [open,setOpen]=useState(false),[detail,setDetail]=useState(null),container=useRef(null);
 const label={superadmin:'Superadmin',admin:'Admin',manager:'Manager',supervisor:'Supervisor',member:'Member'}[role]||role;
 const name=user.name||label;
 useEffect(()=>{if(!open)return;const close=e=>{if(e.key==='Escape'||e.type==='pointerdown'&&!container.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);};},[open]);
 return <div ref={container} className={'account-actions profile-account '+(mobile?'mobile-account-actions':'')}><button type="button" className="profile-trigger" aria-label="Open profile" aria-expanded={open} onClick={()=>setOpen(!open)}>{name.trim().charAt(0).toUpperCase()}</button><div className="profile-dropdown" hidden={!open}><div className="profile-details"><strong>{name}</strong><span>{label}</span></div>{['manager','supervisor'].includes(role)&&<div className="profile-qr"><span>QR pass</span><StaffQrButton/></div>}{role==='admin'&&<>{[['support','Support'],['plan','Plan Details']].map(([key,title])=><button type="button" key={key} className={styles.option} onClick={()=>{setOpen(false);setDetail(key);}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{key==='support'?<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 2v1"/></>:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h4"/></>}</svg>{title}</button>)}</>}<button type="button" className="logout-button" onClick={onSignOut}>Logout</button></div>{role==='admin'&&detail&&<AdminAccountDetails type={detail} user={user} onClose={()=>setDetail(null)}/>}</div>;
}
