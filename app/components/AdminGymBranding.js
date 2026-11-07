'use client';
import {useState} from 'react';
import GymLogoInput from './GymLogoInput';
import {requestApi} from '../../lib/api-client.mjs';
export default function AdminGymBranding({user,onUpdated}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(event){event.preventDefault();setBusy(true);setError('');try{const data=Object.fromEntries(new FormData(event.currentTarget)),profile=await requestApi('gym-logo','PATCH',{gymLogo:data.gymLogo});onUpdated(profile);if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('gym-user-updates');channel.postMessage({gymId:profile.id});channel.close();}setOpen(false);}catch(error){setError(error.message);}finally{setBusy(false);}}
 return <section className="admin-gym-branding" aria-label="Gym branding"><div className="admin-gym-identity"><span className="admin-gym-logo">{user.gymLogo?<img src={user.gymLogo} alt={user.gymName+' logo'}/>:user.gymName?.charAt(0)}</span><div><h2>{user.gymName}</h2>{user.gymAddress&&<p>{user.gymAddress}</p>}</div></div><button type="button" className="secondary" aria-expanded={open} onClick={()=>{setOpen(!open);setError('');}}>Update logo</button>{open&&<form className="admin-logo-form" onSubmit={save}><GymLogoInput id="adminDashboardLogo" defaultValue={user.gymLogo} required/>{error&&<p className="error" role="alert">{error}</p>}<div className="actions"><button className="secondary" type="button" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button><button disabled={busy}>{busy?'Saving…':'Save logo'}</button></div></form>}</section>;
}
