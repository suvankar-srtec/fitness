"use client";
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import styles from './CartDialog.module.css';
export default function CartDialog({onClose,children}){
 const ref=useRef(null);
 useEffect(()=>{const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.focus();const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();onClose();}if(e.key==='Tab'){const items=ref.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',key,true);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key,true);previous?.focus?.();};},[onClose]);
 return createPortal(<div className={styles.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Shopping cart" className={styles.dialog}><header className={styles.header}><h2>Cart</h2><button type="button" aria-label="Close cart" onClick={onClose}>×</button></header><div className={styles.body}>{children}</div></section></div>,document.body);
}
