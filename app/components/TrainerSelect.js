'use client';
import {useEffect,useState} from 'react';import {requestApi} from '../../lib/api-client.mjs';
export default function TrainerSelect({locationId,locationName,value,onChange,required=false,enabled=true}){
 const [trainers,setTrainers]=useState([]),[error,setError]=useState('');
 useEffect(()=>{if(!enabled)return;let active=true;setTrainers([]);if(!locationId&&!locationName)return;requestApi('trainers?'+new URLSearchParams({...(locationId?{locationId}:{}),...(locationName?{locationName}:{})})).then(rows=>{if(active){setTrainers(rows);setError('');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[locationId,locationName,enabled]);
 return <label className="trainer-select-field">Assigned trainer{required?' *':''}<select name="trainerId" value={value||''} onChange={event=>onChange(event.target.value)} required={required}><option value="">{required?'Select trainer':'No trainer'}</option>{value&&!trainers.some(trainer=>String(trainer.id)===String(value))&&<option value={value}>Current trainer (unavailable)</option>}{trainers.map(trainer=><option value={trainer.id} key={trainer.id}>{trainer.name} ({trainer.userId})</option>)}</select>{!trainers.length&&<small>{error||(!locationId&&!locationName?'Select a location to list trainers.':'No enabled trainers at this location.')}</small>}</label>;
}
