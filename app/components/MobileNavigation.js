'use client';
import {useEffect,useId,useRef,useState} from 'react';
import AccountActions from './AccountActions';
import {createPortal} from 'react-dom';
import {requestApi} from '../../lib/api-client.mjs';
export default function MobileNavigation({user,onSignOut,children}){
 const [open,setOpen]=useState(false),[support,setSupport]=useState(null),[error,setError]=useState('');
 const dialog=useRef(null),trigger=useRef(null),titleId=useId();
 useEffect(()=>{
  if(!open)return;
  const element=dialog.current,previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';element.showModal();
  const media=matchMedia('(min-width:851px)'),resize=()=>{if(media.matches)setOpen(false);};media.addEventListener('change',resize);
  let active=true;requestApi('support').then(contact=>{if(active)setSupport(contact);}).catch(()=>{if(active)setError('Support details are temporarily unavailable.');});
  return()=>{active=false;media.removeEventListener('change',resize);element.close();document.body.style.overflow=previousOverflow;trigger.current?.focus();};
 },[open]);
 return <><div className="mobile-navigation-header"><div className="mobile-organization-logo" aria-label={user.gymName||'Organization logo'}>{user.gymLogo?<img src={user.gymLogo} alt={user.gymName||'Organization'}/>:<span aria-hidden="true">{(user.gymName||user.name||'M').trim().charAt(0).toUpperCase()}</span>}</div><button ref={trigger} type="button" className="mobile-hamburger-menu" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setError('');setOpen(true);}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div>{open&&createPortal(<dialog ref={dialog} className="mobile-drawer" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();setOpen(false);}} onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)setOpen(false);}}}><header className="mobile-drawer-header"><h2 id={titleId}>{user.gymName||'Navigation'}</h2><button type="button" aria-label="Close navigation menu" onClick={()=>setOpen(false)}>&times;</button></header><div className="mobile-drawer-scroll"><div className="mobile-drawer-navigation" onClick={event=>{const button=event.target.closest('button');if(button&&!button.hasAttribute('aria-expanded'))setOpen(false);}}>{children}</div><section className="mobile-drawer-support" aria-label="Support contact"><h3>Support</h3>{support?.phone&&<a href={'tel:'+support.phone}>{support.phone}</a>}{support?.email&&<a href={'mailto:'+support.email}>{support.email}</a>}{error&&<p role="status">{error}</p>}{!support&&!error&&<p>Loading support details…</p>}</section><AccountActions role={user.role} user={user} onSignOut={onSignOut} inline/><div className="navigation-credit">Powered by Digigraptek</div></div></dialog>,document.body)}</>;
}
