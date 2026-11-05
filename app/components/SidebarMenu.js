'use client';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function SidebarMenu({label,icon,children}) {
 const [open,setOpen]=useState(false);
 const [position,setPosition]=useState({left:0,top:0});
 const trigger=useRef(null),panel=useRef(null);
 const id=useId();
 useLayoutEffect(()=>{
  if(!open)return;
  const rect=trigger.current.getBoundingClientRect(),width=panel.current.offsetWidth,height=panel.current.offsetHeight;
  const mobile=window.innerWidth<=850;
  setPosition({left:Math.max(8,Math.min(mobile?rect.left:rect.right+10,window.innerWidth-width-8)),top:Math.max(8,Math.min(mobile?rect.bottom+4:rect.top,window.innerHeight-height-8))});
  panel.current.querySelector('button')?.focus();
  const outside=e=>{if(!trigger.current?.contains(e.target)&&!panel.current?.contains(e.target))setOpen(false);};
  const escape=e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  const close=()=>setOpen(false);
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);window.addEventListener('resize',close);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',close);};
 },[open]);
 return <div className="plan-menu"><button ref={trigger} type="button" className="plan-menu-toggle" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(!open)}><span className="nav-menu-label">{icon}<span>{label}</span></span><svg className="nav-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>{open&&createPortal(<nav ref={panel} id={id} className="sidebar-flyout" aria-label={label} style={position} onClick={e=>{if(e.target.closest('button')){setOpen(false);trigger.current?.focus();}}}>{children}</nav>,document.body)}</div>;
}
