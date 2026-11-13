'use client';
import {MessageNotice} from './MessagePopup';

import {useEffect,useRef,useState} from 'react';
import {gatePassMessage} from '../../lib/gate-pass.mjs';

export default function MemberGatePass({member,gymName,onClose}) {
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[sent,setSent]=useState(false),[imageError,setImageError]=useState(false);
 const [requestKey]=useState(()=>crypto.randomUUID());
 const sendRequest=useRef(null);
 useEffect(()=>{let current=true;if(!sendRequest.current)sendRequest.current=fetch('/api/whatsapp-gate-pass',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:member.id,requestKey})}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to send gate pass');return data;});sendRequest.current.then(()=>{if(current)setSent(true);}).catch(error=>{if(current)setError(error.message);}).finally(()=>{if(current)setBusy(false);});return()=>{current=false;};},[member.id,requestKey]);
 return <div className="modal-overlay"><section className="modal-card gate-pass-dialog" role="dialog" aria-modal="true" aria-labelledby="gatePassTitle"><header><h2 id="gatePassTitle">Gate Pass</h2><button type="button" className="secondary" aria-label="Close gate pass" onClick={onClose}>&#215;</button></header>{!imageError?<img className="gate-pass-preview" src={'/api/gate-pass?id='+member.id} alt={member.name+' gate pass with photo, membership validity and QR code'} onError={()=>setImageError(true)}/>:<p className="error">Unable to load gate pass. Close and try again.</p>}<p className="gate-pass-message">{gatePassMessage({...member,public_id:member.memberId,gym_name:member.gymName||gymName})}</p><p role="status">{busy?'Sending gate pass to WhatsApp...':sent?'Gate pass submitted to WhatsApp.':''}</p>{error&&<MessageNotice>{error}</MessageNotice>}<a className="gate-pass-download" href={'/api/gate-pass?id='+member.id} download={member.memberId+'-gate-pass.png'}>Download Gate Pass</a></section></div>;
}
