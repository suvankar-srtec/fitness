'use client';
import {useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
import PhoneInput from './PhoneInput';
import GymLocationInput from './GymLocationInput';
import {MessageNotice} from './MessagePopup';
export default function EmployeeForm({employee=null,viewer={},lockLocation=false,onSaved,onCancel}){
 const [role,setRole]=useState(employee?.role||'supervisor'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const gymId=employee?.gymId||(viewer.role==='admin'?viewer.id:viewer.gymId);
 const fixedLocation=lockLocation||viewer.role==='manager';
 const canChangeRole=viewer.role==='admin'&&employee?.id!==viewer.id;
 async function save(event){event.preventDefault();setBusy(true);setError('');try{
  const body={...Object.fromEntries(new FormData(event.currentTarget)),role,...(employee?{id:employee.id}:{})};
  const saved=await requestApi('employees',employee?'PATCH':'POST',body);await onSaved(saved);
 }catch(error){setError(error.message);}finally{setBusy(false);}}
 return <div className="modal-overlay"><section className="modal-card staff-create" role="dialog" aria-modal="true" aria-labelledby="employeeFormTitle"><form onSubmit={save}><h2 id="employeeFormTitle">{employee?'Edit Employee':'Add Employee'}</h2><div className="employee-form-grid"><div><label htmlFor="employeeId">ID (EMP)</label><input id="employeeId" value={employee?.userId||'Generated on save'} readOnly/>{!employee&&<small>EMP + gym name + location + unique code</small>}</div><div><label htmlFor="employeeRole">Employee role</label><select id="employeeRole" value={role} onChange={event=>setRole(event.target.value)} disabled={!canChangeRole||busy}>{[['manager','Manager'],['supervisor','Supervisor']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="employeeName">Name</label><input id="employeeName" name="name" defaultValue={employee?.name||''} required maxLength={100} autoFocus/></div><div><label htmlFor="employeeGym">Gym</label><input id="employeeGym" value={employee?.gymName||viewer.gymName||''} readOnly/></div><div><label htmlFor="employeeLocation">Gym location</label>{fixedLocation?<><input id="employeeLocation" value={viewer.locationName||employee?.locationName||''} readOnly/><input type="hidden" name="locationId" value={viewer.locationId||employee?.locationId||''}/></>:<GymLocationInput id="employeeLocation" gymAdminId={gymId} defaultValue={employee?.locationName||''}/>}</div><div><label htmlFor="employeePhone">Phone</label><PhoneInput id="employeePhone" defaultValue={employee?.phone||''}/></div><div><label htmlFor="employeeEmail">Email</label><input id="employeeEmail" name="email" type="email" maxLength={254} defaultValue={employee?.email||''}/></div></div><MessageNotice>{error}</MessageNotice><div className="actions"><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button><button disabled={busy}>{busy?'Saving...':employee?'Save employee':'Create employee'}</button></div></form></section></div>;
}
