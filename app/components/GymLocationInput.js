'use client';
import {useEffect,useId,useState} from 'react';
import {requestApi} from '../../lib/api-client.mjs';

export default function GymLocationInput({id,gymAdminId,defaultValue=''}){
 const listId=useId();
 const [locations,setLocations]=useState([]),[value,setValue]=useState(defaultValue),[error,setError]=useState('');
 useEffect(()=>{
  if(!gymAdminId)return;
  let current=true;
  requestApi('gym-locations?adminId='+encodeURIComponent(gymAdminId)).then(rows=>{if(current){setLocations(rows);setError('');}}).catch(error=>{if(current)setError(error.message);});
  return()=>{current=false;};
 },[gymAdminId]);
 return <><input id={id} name="locationName" list={listId} required maxLength={120} value={value} disabled={!gymAdminId} placeholder={gymAdminId?'Select or type location':'Select gym first'} autoComplete="off" onChange={event=>setValue(event.target.value)}/><datalist id={listId}>{locations.map(location=><option key={location.id} value={location.name}/>)}</datalist>{error&&<p className="error" role="alert">{error}</p>}</>;
}
