'use client';
import {useEffect,useId,useRef,useState} from 'react';
export default function SidebarMenu({label,icon,children}){
 const [open,setOpen]=useState(false),id=useId(),root=useRef(null);
 useEffect(()=>{const close=e=>{if(e.detail!==id)setOpen(false);};document.addEventListener('sidebar-expand',close);return()=>document.removeEventListener('sidebar-expand',close);},[id]);
 return <div ref={root} className="plan-menu"><button type="button" className="plan-menu-toggle" aria-expanded={open} aria-controls={id} onClick={()=>{document.dispatchEvent(new CustomEvent('sidebar-expand',{detail:id}));setOpen(!open);}}><span className="nav-menu-label">{icon}<span>{label}</span></span><svg className="nav-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button><nav id={id} className="sidebar-inline-submenu" hidden={!open} aria-label={label}>{children}</nav></div>;
}
