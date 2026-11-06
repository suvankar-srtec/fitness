'use client';
import {useState} from 'react';

export default function GymLogoInput({id,defaultValue='',required=false}) {
 const [logo,setLogo]=useState(defaultValue),[error,setError]=useState('');
 async function choose(event){
  const file=event.target.files?.[0];setError('');
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){event.target.value='';setError('Choose a JPG, PNG or WebP image up to 2 MB');return;}
  try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});setLogo(data);}catch{setError('Unable to read logo');}
 }
 return <><input type="hidden" name="gymLogo" value={logo}/><div className="gym-logo-input">{logo&&<img src={logo} alt="Gym logo preview"/>}<input id={id} type="file" required={required&&!logo} accept="image/jpeg,image/png,image/webp" onChange={choose}/>{logo&&<button type="button" className="secondary" onClick={()=>{setLogo('');document.getElementById(id).value='';}}>Remove</button>}</div>{error&&<p className="error" role="alert">{error}</p>}</>;
}
