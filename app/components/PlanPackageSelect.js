'use client';
import {useState} from 'react';
import {planCategories,normalizePlanCategory} from '../../lib/plans.mjs';
export default function PlanPackageSelect({plans,defaultValue='Gym'}){
 const [value,setValue]=useState(defaultValue),[created,setCreated]=useState([]),[open,setOpen]=useState(false),[name,setName]=useState(''),[error,setError]=useState('');
 const categories=planCategories(plans,[value,...created]);
 function add(){const category=normalizePlanCategory(name);if(!category){setError('Enter a package name of 1 to 60 characters');return;}const existing=categories.find(c=>c.toLowerCase()===category.toLowerCase());setValue(existing||category);if(!existing)setCreated(list=>[...list,category]);setName('');setError('');setOpen(false);}
 return <div className="plan-package-field"><div className="plan-package-select-row"><select id="planCategory" name="category" value={value} onChange={e=>setValue(e.target.value)}>{categories.map(category=><option key={category}>{category}</option>)}</select><button type="button" className="secondary plan-package-add" aria-label="Add package" aria-expanded={open} onClick={()=>setOpen(!open)}>+</button></div>{open&&<div className="plan-package-create"><input aria-label="New package name" placeholder="Package name, e.g. Pilates" value={name} maxLength={60} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}} autoFocus/><button type="button" onClick={add}>Add</button><button type="button" className="secondary" onClick={()=>{setOpen(false);setError('');}}>Cancel</button></div>}{error&&<p role="alert" className="plan-package-error">{error}</p>}</div>;
}
