'use client';
import {Children,isValidElement,useEffect,useRef,useState} from 'react';
import styles from './MessagePopup.module.css';
const eventName='gym-message';
export function showMessage(message){window.dispatchEvent(new CustomEvent(eventName,{detail:{message:String(message)}}));}
export function confirmMessage(message){return new Promise(resolve=>window.dispatchEvent(new CustomEvent(eventName,{detail:{message,resolve}})));}
function textContent(value){return Children.toArray(value).map(child=>isValidElement(child)?textContent(child.props.children):String(child)).join(' ').trim();}
export function MessageNotice({children}){
 const message=textContent(children);
 useEffect(()=>{if(message)window.dispatchEvent(new CustomEvent(eventName,{detail:{message,content:children}}));},[message]);
 return null;
}
export default function MessagePopup(){
 const [messages,setMessages]=useState([]);
 const dialog=useRef(null),returnFocus=useRef(null);
 const active=messages[0];
 useEffect(()=>{
  const enqueue=event=>{const item=event.detail;if(!item?.message)return;setMessages(previous=>!item.resolve&&previous.some(entry=>entry.message===item.message)?previous:[...previous,item]);};
  let validating=false;
  const invalid=event=>{event.preventDefault();if(validating)return;validating=true;queueMicrotask(()=>{validating=false;});const input=event.target;window.dispatchEvent(new CustomEvent(eventName,{detail:{message:input.validationMessage,target:input}}));};
  window.addEventListener(eventName,enqueue);document.addEventListener('invalid',invalid,true);
  return()=>{window.removeEventListener(eventName,enqueue);document.removeEventListener('invalid',invalid,true);};
 },[]);
 useEffect(()=>{if(active&&!dialog.current.open){returnFocus.current=document.activeElement;dialog.current.showModal();}else if(!active&&dialog.current.open){dialog.current.close();returnFocus.current?.focus?.();}},[active]);
 function dismiss(confirmed=false){active?.resolve?.(confirmed);if(active?.target)returnFocus.current=active.target;setMessages(previous=>previous.slice(1));}
 return <dialog ref={dialog} className={styles.popup} aria-labelledby="app-message-title" aria-describedby="app-message-body" onCancel={event=>{event.preventDefault();dismiss();}}><header><span className={styles.icon} aria-hidden="true">i</span><h2 id="app-message-title">{active?.resolve?'Confirm action':'Message'}</h2><button type="button" className={styles.close} aria-label="Close message" onClick={()=>dismiss()}>Ã—</button></header><div id="app-message-body" className={styles.body}>{active?.content||active?.message}</div><footer>{active?.resolve&&<button type="button" className={styles.cancel} onClick={()=>dismiss()}>Cancel</button>}<button type="button" onClick={()=>dismiss(true)} autoFocus>{active?.resolve?'Confirm':'OK'}</button></footer></dialog>;
}
