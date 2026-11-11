'use client';
import {useState} from 'react';
import useAdminActivity from '../hooks/useAdminActivity';
import LocationCollections from './LocationCollections';
import {totalPayments} from '../../lib/payment-report.mjs';
export default function CollectionWorkspace(){
 const {data,loading,error}=useAdminActivity(true);
 const [from,setFrom]=useState(''),[to,setTo]=useState('');
 const payments=(data.revenue||[]).filter(row=>(!from||row.date>=from)&&(!to||row.date<=to));
 const total=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(totalPayments(payments)));
 return <div className="collection-workspace"><div className="collection-filters"><label>From<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label><div className="collection-total"><span>Total collection</span><strong>{loading?'…':total}</strong></div></div>{error&&<p role="alert">{error}</p>}{loading?<p role="status">Loading collections…</p>:<LocationCollections payments={payments}/>}</div>;
}
