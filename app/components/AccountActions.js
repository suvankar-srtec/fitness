 'use client';
import {useEffect,useRef,useState} from 'react';
import StaffQrButton from './StaffQrButton';
export default function AccountActions({role,user={},onSignOut,mobile=false}){
 const [open,setOpen]=useState(false),container=useRef(null);
 const label={superadmin:'Superadmin',admin:'Admin',manager:'Manager',supervisor:'Supervisor',member:'Member'}[role]||role;
 const name=user.name||label;
 useEffect(()=>{if(!open)return;const close=e=>{if(e.key==='Escape'||e.type==='pointerdown'&&!container.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',close);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close);};},[open]);
 return <div ref={container} className={'account-actions profile-account '+(mobile?'mobile-account-actions':'')}><button type="button" className="profile-trigger" aria-label="Open profile" aria-expanded={open} onClick={()=>setOpen(!open)}>{name.trim().charAt(0).toUpperCase()}</button><div className="profile-dropdown" hidden={!open}><div className="profile-details"><strong>{name}</strong><span>{label}</span></div>{['manager','supervisor'].includes(role)&&<div className="profile-qr"><span>QR pass</span><StaffQrButton/></div>}<button type="button" className="logout-button" onClick={onSignOut}>Logout</button></div></div>;
}
