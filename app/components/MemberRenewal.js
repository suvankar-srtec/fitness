'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {requestApi} from '../../lib/api-client.mjs';
import {planOptionLabel} from '../../lib/plan-option.mjs';
import {memberToday} from '../../lib/members.mjs';
import {monthlyRenewalDates} from '../../lib/advance-renewal.mjs';
import styles from './MemberRenewal.module.css';
const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(value||0));
const date=value=>value?.split('-').reverse().join('-');
export default function MemberRenewal({member,plans,onCancel,onSaved}){
 const [paymentType,setPaymentType]=useState('Full'),[amount,setAmount]=useState(''),[planId,setPlanId]=useState(String(member.plan_id||'')),[months,setMonths]=useState(3),[trainer,setTrainer]=useState(false),[method,setMethod]=useState('Cash'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const kind=member.valid_to&&member.valid_to>=memberToday()?'Advance':'Renew';
 const requestKey=useRef(null),pending=useRef(false);
 const currentPlan=plans.find(p=>Number(p.id)===Number(member.plan_id));
 const available=plans.filter(p=>p.amount!=null&&(Number(p.id)===Number(member.plan_id)||Number(p.amount)>=Number(currentPlan?.amount||0)));
 const plan=available.find(p=>String(p.id)===planId),term=monthlyRenewalDates(member.valid_to,months);
 useEffect(()=>{requestKey.current=null;},[kind,planId,months,trainer,method,paymentType,amount]);
 useEffect(()=>{const close=e=>{if(e.key==='Escape'&&!pending.current)onCancel();};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[onCancel]);
 async function save(e){e.preventDefault();if(pending.current)return;pending.current=true;setBusy(true);setError('');try{
  requestKey.current??=crypto.randomUUID();
  await requestApi('membership-renew','POST',{memberId:member.id,planId:Number(planId),months,kind,trainer,method,paymentType,amount,requestKey:requestKey.current});
  window.dispatchEvent(new Event('gym-members-changed'));await onSaved();
 }catch(e){setError(e.message);}finally{pending.current=false;setBusy(false);}}
 return createPortal(<div className="modal-overlay"><section className={'modal-card '+styles.dialog} role="dialog" aria-modal="true" aria-labelledby="renewMemberTitle"><header className={styles.header}><div><h2 id="renewMemberTitle">Payment</h2><span>{member.name} / {member.memberId||member.public_id}</span></div><button type="button" className="secondary" aria-label="Close renewal" disabled={busy} onClick={onCancel}>×</button></header><form onSubmit={save}><div className={styles.fields}><label>Plan<select value={planId} onChange={e=>setPlanId(e.target.value)} disabled={busy} required><option value="" disabled>Select plan</option>{available.map(p=><option value={p.id} key={p.id}>{planOptionLabel(p)}</option>)}</select></label><label>Duration<select value={months} onChange={e=>setMonths(Number(e.target.value))} disabled={busy}>{[3,6,12].map(value=><option key={value} value={value}>{value} Months</option>)}</select></label><label>Payment<select value={paymentType} disabled={busy} onChange={e=>setPaymentType(e.target.value)}><option value="Full">Full Payment</option><option value="Part">Part Payment</option></select></label>{paymentType==='Part'&&<label>Amount (INR)<input type="number" min="0.01" step="0.01" max={Number(plan?.amount||0)*months-0.01} value={amount} onChange={e=>setAmount(e.target.value)} required disabled={busy}/></label>}<label>Payment mode<select value={method} onChange={e=>setMethod(e.target.value)} disabled={busy}><option>Cash</option><option>Online</option></select></label><label className={styles.trainer}><input type="checkbox" checked={trainer} onChange={e=>setTrainer(e.target.checked)} disabled={busy}/>Trainer</label></div><div className={styles.total}><div><span>{term?date(term.from)+' / '+date(term.to):''}</span>{plan&&<small>{money(plan.amount)} × {months} months</small>}</div><div><strong>{money(Number(plan?.amount||0)*months)}</strong>{paymentType==='Part'&&<small>Due: {money(Math.max(0,Number(plan?.amount||0)*months-Number(amount||0)))}</small>}</div></div>{error&&<p role="alert" className="error">{error}</p>}<footer className={styles.actions}><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button><button disabled={busy||!plan}>{busy?'Saving…':'Pay now'}</button></footer></form></section></div>,document.body);
}
