 'use client';
import {useEffect,useRef,useState} from 'react';
import StaffQrButton from './StaffQrButton';
import AdminAccountDetails from './AdminAccountDetails';
import dynamic from 'next/dynamic';
import {requestApi} from '../../lib/api-client.mjs';
const MemberQueries=dynamic(()=>import('./MemberQueries'));
import styles from './AdminAccountDetails.module.css';
export default function AccountActions({role,user={},onSignOut,mobile=false}){
 const [open,setOpen]=useState(false),[detail,setDetail]=useState(null),container=useRef(null);
 const [unread,setUnread]=useState(0);
 async function refreshQueries(){try{const result=await requestApi('member-queries?unread=1');setUnread(result.count||0);}catch{}}
 useEffect(()=>{if(role!=='admin')return;refreshQueries();const timer=setInterval(()=>{if(document.visibilityState==='visible')refreshQueries();},60000);return()=>clearInterval(timer);},[role]);
 const label={superadmin:'Superadmin',admin:'Admin',manager:'Manager',supervisor:'Supervisor',member:'Member'}[role]||role;
 const name=user.name||label;
 useEffect(()=>{if(!open)return;const close=e=>{if(e.key==='Escape'||e.type==='pointerdown'&&!container.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);};},[open]);
 return <div ref={container} className={'account-actions profile-account '+(mobile?'mobile-account-actions':'')}><button type="button" className="profile-trigger" style={{position:'relative'}} aria-label="Open profile" aria-expanded={open} onClick={()=>setOpen(!open)}>{name.trim().charAt(0).toUpperCase()}{unread>0&&<span aria-label="Unread queries" style={{position:'absolute',right:0,top:0,width:9,height:9,borderRadius:'50%',background:'#f97316',border:'2px solid white'}}/>}</button><div className="profile-dropdown" hidden={!open}><div className="profile-details"><strong>{name}</strong><span>{label}</span>{user.phone&&<span>{user.phone}</span>}{user.email&&<a className="contact-email" href={'mailto:'+user.email}>{user.email}</a>}</div>{['manager','supervisor'].includes(role)&&<div className="profile-qr"><span>QR pass</span><StaffQrButton/></div>}{role==='admin'&&<>{[['support','Support'],['plan','Plan Details']].map(([key,title])=><button type="button" key={key} className={styles.option} onClick={()=>{setOpen(false);setDetail(key);}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{key==='support'?<><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 2v1"/></>:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h4"/></>}</svg>{title}</button>)}</>}{['admin','member'].includes(role)&&<button type="button" className={styles.option} onClick={()=>{setOpen(false);setDetail('query');}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 4h16v12H9l-5 4Z"/><path d="M8 8h8m-8 4h5"/></svg>Query{unread>0&&<span aria-label="Unread" style={{width:8,height:8,borderRadius:'50%',background:'#f97316'}}/>}</button>}<button type="button" className="logout-button" onClick={onSignOut}>Logout</button></div>{detail==='query'&&<MemberQueries role={role} onClose={()=>setDetail(null)} onRead={refreshQueries}/>} {role==='admin'&&detail&&detail!=='query'&&<AdminAccountDetails type={detail} user={user} onClose={()=>setDetail(null)}/>}</div>;
}
