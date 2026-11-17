'use client';
import {useEffect,useId,useRef,useState} from 'react';
import AccountActions from './AccountActions';
import NativeAccountMenu,{SupportLinks} from './NativeAccountMenu';
import StaffQrButton from './StaffQrButton';
import {createPortal} from 'react-dom';
import {requestApi} from '../../lib/api-client.mjs';
export default function MobileNavigation({user,onSignOut,children}){
 const [open,setOpen]=useState(false),[native,setNative]=useState(false),[support,setSupport]=useState(null),[error,setError]=useState(''),[qrOpen,setQrOpen]=useState(false);
 const dialog=useRef(null),trigger=useRef(null),titleId=useId();
 const logo=user.gymLogo||'';
 const organization=user.gymName||(user.role==='superadmin'?'Membership Management System':'Organization');
 useEffect(()=>{setNative(/MembershipAndroid\/|MembershipIOS\//.test(navigator.userAgent));},[]);
 async function loadSupport(){try{const contact=await requestApi('support','GET',undefined,{silent:true});setSupport(contact);setError('');}catch{setError('Support details are temporarily unavailable.');}}
 useEffect(()=>{
  if(!open)return;
  const element=dialog.current,previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';element.showModal();
  const media=matchMedia('(min-width:851px)'),resize=()=>{if(media.matches)setOpen(false);};media.addEventListener('change',resize);
  loadSupport();
  return()=>{media.removeEventListener('change',resize);element.close();document.body.style.overflow=previousOverflow;trigger.current?.focus();};
 },[open]);
 const hamburger=<button ref={trigger} type="button" className="mobile-hamburger-menu" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>;
 const brand=logo?<img src={logo} alt={organization+' logo'}/>:<span aria-hidden="true">{organization.trim().charAt(0).toUpperCase()}</span>;
 const supportSection=<section className="mobile-drawer-support" aria-label="Support contact"><h3>Support</h3>{error?<><p role="status">{error}</p><button type="button" onClick={loadSupport}>Retry</button></>:support?<SupportLinks contact={support}/>:<p role="status">Loading support details...</p>}</section>;
 return <><div className={'mobile-navigation-header'+(native?' native-app-navigation':'')}>{native?<>{hamburger}<strong className="native-organization-name">{organization}</strong><NativeAccountMenu user={user}/></>:<><div className="mobile-organization-logo" aria-label={organization+' logo'}>{brand}</div>{hamburger}</>}</div>{open&&createPortal(<dialog ref={dialog} className={'mobile-drawer'+(native?' native-app-drawer':'')} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();setOpen(false);}} onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)setOpen(false);}}}>{native?<header className="native-drawer-brand">{/* The installed Android back handler locates this hidden action. */}<button hidden type="button" className="native-drawer-back-target" aria-label="Close navigation menu" onClick={()=>setOpen(false)}/><div className="native-logo-arch">{brand}</div><h2 id={titleId}>{organization}</h2></header>:<header className="mobile-drawer-header"><h2 id={titleId}>{organization}</h2><button type="button" aria-label="Close navigation menu" onClick={()=>setOpen(false)}>&times;</button></header>}<div className="mobile-drawer-scroll"><div className="mobile-drawer-navigation" onClick={event=>{const button=event.target.closest('button');if(button&&!button.hasAttribute('aria-expanded'))setOpen(false);}}>{children}</div>{native?<div className="native-drawer-tools">{['manager','supervisor'].includes(user.role)&&<button type="button" onClick={()=>{setOpen(false);setQrOpen(true);}}>My QR pass</button>}</div>:<>{supportSection}<AccountActions role={user.role} user={user} onSignOut={onSignOut} inline/></>}</div>{native&&<div className="native-drawer-bottom">{supportSection}<a className="native-drawer-credit" href="https://www.digigraptek.com/" aria-label="Visit Digigraptek website">Powered by Digigraptek</a><button type="button" className="logout-button" onClick={onSignOut}>Logout</button></div>}</dialog>,document.body)}{qrOpen&&<div hidden><StaffQrButton initialOpen onClose={()=>setQrOpen(false)}/></div>}</>;
}
