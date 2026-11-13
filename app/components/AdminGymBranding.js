'use client';
import {MessageNotice} from './MessagePopup';

import {useEffect,useRef,useState} from 'react';
import GymLogoInput from './GymLogoInput';
import {requestApi} from '../../lib/api-client.mjs';
export default function AdminGymBranding({user,onUpdated}){
 const dialog=useRef(null);
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!open)return;const element=dialog.current,overflow=document.body.style.overflow;document.body.style.overflow='hidden';element.showModal();return()=>{element.close();document.body.style.overflow=overflow;};},[open]);
 async function save(event){event.preventDefault();setBusy(true);setError('');try{const data=Object.fromEntries(new FormData(event.currentTarget)),profile=await requestApi('gym-logo','PATCH',{gymLogo:data.gymLogo});onUpdated(profile);if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('gym-user-updates');channel.postMessage({gymId:profile.id});channel.close();}setOpen(false);}catch(error){setError(error.message);}finally{setBusy(false);}}
 return <><button type="button" className="secondary navbar-update-logo" aria-haspopup="dialog" onClick={()=>{setOpen(true);setError('');}}>Update logo</button>{open&&<dialog ref={dialog} className="navbar-logo-dialog" aria-label="Update gym logo" onCancel={event=>{if(busy)event.preventDefault();else setOpen(false);}} onClick={event=>{if(!busy&&event.target===event.currentTarget)setOpen(false);}}><form className="admin-logo-form" onSubmit={save}><h2>Update gym logo</h2><GymLogoInput id="adminNavbarLogo" defaultValue={user.gymLogo} required/>{error&&<MessageNotice>{error}</MessageNotice>}<div className="actions"><button className="secondary" type="button" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button><button disabled={busy}>{busy?'Saving?':'Save logo'}</button></div></form></dialog>}</>;
}
