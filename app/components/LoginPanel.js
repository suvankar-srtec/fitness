'use client';
import {useEffect,useRef,useState} from 'react';
import PhoneInput from './PhoneInput';
import {requestApi} from '../../lib/api-client.mjs';
import {normalizeWhatsAppPhone} from '../../lib/whatsapp.mjs';
function Secret({name,placeholder,autoComplete='new-password'}){const [visible,setVisible]=useState(false);return <div className="password-field"><input name={name} aria-label={placeholder} placeholder={placeholder} type={visible?'text':'password'} autoComplete={autoComplete} required/><button type="button" className="password-toggle" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>{visible&&<path d="m3 3 18 18"/>}</svg></button></div>;}
export default function LoginPanel({onSignIn,error,onClearError,busy:signingIn}){
 const inFlight=useRef(false);
 const [mode,setMode]=useState('login'),[root,setRoot]=useState(false),[phone,setPhone]=useState(null),[challenge,setChallenge]=useState(null),[resetToken,setResetToken]=useState(null),[localError,setLocalError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[cooldown,setCooldown]=useState(0);
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('setup')==='1')setMode('setup');},[]);
 useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
 function change(next){setMode(next);setLocalError('');setNotice('');setChallenge(null);setResetToken(null);onClearError?.();}
 async function requestCode(data){const result=await requestApi('otp-request','POST',data);setPhone(data);setChallenge(result.challengeId);setMode('otp');setCooldown(result.resendAfter||60);setNotice(result.message||'');}
 async function submit(event){event.preventDefault();if(inFlight.current)return;inFlight.current=true;const data=Object.fromEntries(new FormData(event.currentTarget));setLocalError('');setNotice('');onClearError?.();setBusy(true);try{
  if(mode==='login'){if(!root)setPhone({phone:data.phone,country:data.country});await onSignIn(data);}
  else if(mode==='setup')await requestCode(data);
  else if(mode==='otp'){const result=await requestApi('otp-verify','POST',{challengeId:challenge,code:data.code});setResetToken(result.resetToken);setMode('password');}
  else{await requestApi('otp-set-password','POST',{challengeId:challenge,resetToken,password:data.password,confirmPassword:data.confirmPassword});setMode('login');setChallenge(null);setResetToken(null);setNotice('Password saved. Sign in with your mobile number.');}
 }catch(error){if(['MEMBERSHIP_EXPIRED','MEMBER_INACTIVE'].includes(error.code)){window.alert(error.message);setLocalError('');return;}setLocalError(error.message);if(error.code==='PASSWORD_SETUP_REQUIRED'){setRoot(false);setMode('setup');}}finally{inFlight.current=false;setBusy(false);}}
 async function resend(){if(inFlight.current)return;inFlight.current=true;setBusy(true);setLocalError('');try{await requestCode({...phone,challengeId:challenge});}catch(error){setLocalError(error.message);}finally{inFlight.current=false;setBusy(false);}}
 const disabled=busy||signingIn;
 return <div className="login-page"><div className="login-ambient" aria-hidden="true"/><section className="login-panel"><header className="login-panel-header"><div className="login-mark" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 16h10M5 12v8m4-12v16m14-16v16m4-12v8M5 16H2m28 0h-3"/></svg></div><h1>Gym Management</h1></header><form key={mode+String(root)} className="login-form phone-login-form" onSubmit={submit}>
 {mode!=='login'&&<h2>{mode==='setup'?'Set your password':mode==='otp'?'WhatsApp verification':'Choose your password'}</h2>}
 {(mode==='setup'||mode==='login')&&(root&&mode==='login'?<input name="userId" placeholder="User ID" aria-label="User ID" autoComplete="username" required/>:<PhoneInput key={mode+String(root)} id="loginPhone" placeholder="Mobile number" defaultValue={phone?normalizeWhatsAppPhone(phone.phone,phone.country)||'':''}/>)}
 {mode==='login'&&<Secret name="password" placeholder="Password" autoComplete="current-password"/>}
 {mode==='otp'&&<input name="code" aria-label="WhatsApp OTP" placeholder="Six-digit WhatsApp OTP" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus/>}
 {mode==='password'&&<><Secret name="password" placeholder="New password"/><Secret name="confirmPassword" placeholder="Confirm password"/></>}
 {(localError||error)&&<p className="login-error" role="alert">{localError||error}</p>}{notice&&<p className="login-notice" role="status">{notice}</p>}
 <button className="login-submit" disabled={disabled}>{disabled?'Please wait...':mode==='login'?'Sign in':mode==='setup'?'Send WhatsApp OTP':mode==='otp'?'Verify OTP':'Save password'}</button>
 {mode==='login'?<div className="login-links">{!root&&<button type="button" disabled={disabled} onClick={()=>change('setup')}>Set / reset password</button>}<button type="button" disabled={disabled} onClick={()=>{setRoot(!root);change('login');}}>{root?'Mobile login':'User ID'}</button></div>:<div className="login-links">{mode==='otp'&&<button type="button" onClick={resend} disabled={disabled||cooldown>0}>{cooldown?'Resend OTP in '+cooldown+'s':'Resend OTP'}</button>}<button type="button" disabled={disabled} onClick={()=>change('login')}>Back to login</button></div>}
 </form></section></div>;
}
