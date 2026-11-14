'use client';
import {MessageNotice} from './MessagePopup';

import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {requestApi} from '../../lib/api-client.mjs';
import {normalizeLocationName} from '../../lib/gym-locations.mjs';
export default function GymLocationInput({id,gymAdminId,defaultValue=''}){
 const listId=useId(),field=useRef(null),input=useRef(null),menu=useRef(null),refresh=useRef(()=>{});
 const [locations,setLocations]=useState([]),[value,setValue]=useState(()=>normalizeLocationName(defaultValue)||''),[error,setError]=useState(''),[open,setOpen]=useState(false),[showAll,setShowAll]=useState(true),[active,setActive]=useState(-1),[position,setPosition]=useState({left:0,top:0,width:0});
 const options=locations.filter(location=>showAll||location.name.toLowerCase().includes(value.trim().toLowerCase()));
 useEffect(()=>{
  if(!gymAdminId)return;let current=true,pending=false;
  async function load(){if(pending)return;pending=true;try{const rows=await requestApi('gym-locations?adminId='+encodeURIComponent(gymAdminId));if(current){setLocations(rows.filter(location=>normalizeLocationName(location.name)));setError('');}}catch(error){if(current)setError(error.message);}finally{pending=false;}}
  refresh.current=load;load();window.addEventListener('focus',load);
  return()=>{current=false;refresh.current=()=>{};window.removeEventListener('focus',load);};
 },[gymAdminId]);
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{const rect=field.current.getBoundingClientRect(),width=Math.min(rect.width,window.innerWidth-16);if(menu.current)menu.current.style.width=width+'px';const height=Math.min(menu.current?.offsetHeight||180,180),below=window.innerHeight-rect.bottom;setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-width-8)),top:below<height+8&&rect.top>height?rect.top-height-5:rect.bottom+5,width});};
  const outside=event=>{if(!field.current?.contains(event.target)&&!menu.current?.contains(event.target))setOpen(false);};
  place();document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open,options.length]);
 function choose(location){setValue(location.name);setOpen(false);setActive(-1);input.current?.focus();}
 function keyboard(event){
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(!open){setShowAll(true);setOpen(true);setActive(0);}else setActive(index=>options.length?(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length:-1);}
  else if(event.key==='Enter'&&open&&active>=0&&options[active]){event.preventDefault();choose(options[active]);}
  else if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);setActive(-1);}
  else if(event.key==='Tab')setOpen(false);
 }
 return <div ref={field} className="gym-location-combobox"><div className="gym-location-field"><input ref={input} id={id} name="locationName" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open?listId:undefined} aria-activedescendant={open&&options[active]?listId+'-'+options[active].id:undefined} required maxLength={120} value={value} disabled={!gymAdminId} placeholder={gymAdminId?'Select or type location':'Select organization first'} autoComplete="off" onFocus={()=>{refresh.current();setShowAll(true);setOpen(true);setActive(-1);}} onChange={event=>{setValue(event.target.value);setShowAll(false);setOpen(true);setActive(-1);}} onKeyDown={keyboard}/><button type="button" className="gym-location-toggle" aria-label="Show locations" aria-expanded={open} aria-controls={open?listId:undefined} disabled={!gymAdminId} onMouseDown={event=>event.preventDefault()} onClick={()=>{const next=!open;input.current?.focus();refresh.current();setShowAll(true);setActive(-1);setOpen(next);}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div>{error&&<MessageNotice>{error}</MessageNotice>}{open&&gymAdminId&&createPortal(<ul ref={menu} id={listId} role="listbox" className="gym-location-options" style={position}>{options.map((location,index)=><li key={location.id} role="presentation"><button type="button" id={listId+'-'+location.id} role="option" tabIndex={-1} aria-selected={value.toLowerCase()===location.name.toLowerCase()} className={index===active?'is-focused':''} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(location)}>{location.name}</button></li>)}{!options.length&&<li className="gym-location-empty" role="option" aria-disabled="true">No locations</li>}</ul>,document.body)}</div>;
}
