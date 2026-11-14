'use client';
import {useEffect,useRef,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';
import ContactDetails from './ContactDetails';
export default function EmployeeDetails({employee,onClose}){
 const dialog=useRef(null),[person,setPerson]=useState(null),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();let active=true;requestApi('employee-details?id='+employee.id).then(value=>{if(active)setPerson(value);}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[employee.id]);
 return <dialog ref={dialog} className="employee-details-dialog" onCancel={event=>{event.preventDefault();onClose();}} aria-labelledby="employeeViewTitle"><header><h2 id="employeeViewTitle">Employee details</h2><button type="button" className="secondary" aria-label="Close employee details" onClick={onClose}>×</button></header>{error?<p role="alert">{error}</p>:person?<dl><dt>Name</dt><dd>{person.name}</dd><dt>Contact</dt><dd><ContactDetails person={person}/></dd><dt>Location</dt><dd>{person.locationName||'Not assigned'}</dd><dt>Status today ({person.date})</dt><dd><span className={'membership-validity-status '+(person.attendanceStatus==='Present'?'is-active':'is-expired')}>{person.attendanceStatus}</span></dd></dl>:<p role="status">Loading employee...</p>}<footer><button type="button" className="secondary" onClick={onClose}>Close</button></footer></dialog>;
}
