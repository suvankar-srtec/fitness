
'use client';
import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import Supplements from './Supplements';
import CommerceIcon from './CommerceIcon';
export function MemberShoppingButton({member,onClick}){return <button type="button" className="secondary member-shopping-button" title={'Shop for '+member.name} aria-label={'Shop for '+member.name} onClick={onClick}><CommerceIcon name="bag"/></button>;}
export default function MemberShopping({member,onClose}){
 useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';const escape=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',escape);return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',escape);};},[onClose]);
 return createPortal(<div className="modal-overlay"><section className="modal-card member-shopping-dialog" role="dialog" aria-modal="true" aria-labelledby="memberShoppingTitle"><header><div className="member-shopping-title"><span><CommerceIcon name="bag"/></span><div><h2 id="memberShoppingTitle">Shopping bag</h2><small>{member.name}</small></div></div><button type="button" className="secondary" aria-label="Close supplements" onClick={onClose}>&times;</button></header><Supplements staff orderOnly memberId={member.id}/></section></div>,document.body);
}
