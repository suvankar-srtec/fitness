'use client';
import {useEffect,useRef,useState} from 'react';
import {cameraErrorMessage,startQrCamera} from '../../lib/qr-scanner.mjs';
import {gatePassTokenFromQr} from '../../lib/gate-pass.mjs';
import {requestApi} from '../../lib/api-client.mjs';
export default function SupervisorScanner({onAttendanceMarked}) {
 const video=useRef(null),fileInput=useRef(null),scanRun=useRef(0),onMarked=useRef(onAttendanceMarked);
 useEffect(()=>{onMarked.current=onAttendanceMarked;},[onAttendanceMarked]);
 const [active,setActive]=useState(true),[status,setStatus]=useState('Opening camera...'),[cameraError,setCameraError]=useState(''),[result,setResult]=useState(null),[marking,setMarking]=useState(false),[scanError,setScanError]=useState('');
 useEffect(()=>()=>{scanRun.current++;},[]);
 async function scanned(text){
  setActive(false);setCameraError('');setScanError('');setResult(null);
  if(!gatePassTokenFromQr(text)){setScanError('Scan a valid gym gate-pass QR code.');setStatus('');setMarking(false);return;}
  const run=++scanRun.current;setMarking(true);setStatus('Marking attendance...');
  try{const data=await requestApi('gate-pass-scan','POST',{qr:text});if(data.markedPresent&&typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('gym-attendance-updates');channel.postMessage({date:data.date});channel.close();}if(run!==scanRun.current)return;if(data.markedPresent)onMarked.current?.(data);setResult(data);setStatus(data.markedPresent?(data.alreadyPresent?'Already marked present today':'Marked present'):data.membershipStatus==='Expired'?'Membership expired':'Gate pass is not active');}
  catch(error){if(run===scanRun.current){setScanError(error.message);setStatus('');}}
  finally{if(run===scanRun.current)setMarking(false);}
 }
 useEffect(()=>{
  if(!active)return;
  if(!window.isSecureContext){setCameraError('Camera access requires HTTPS.');setActive(false);return;}
  if(!navigator.mediaDevices?.getUserMedia){setCameraError('Camera is not supported in this browser.');setActive(false);return;}
  const session=startQrCamera({video:video.current,getMedia:constraints=>navigator.mediaDevices.getUserMedia(constraints),loadReader:async()=>{const {BrowserQRCodeReader}=await import('@zxing/browser');return new BrowserQRCodeReader();},onReady:()=>setStatus('Scanning...'),onResult:scanned,onError:error=>{setCameraError(cameraErrorMessage(error));setActive(false);}});
  const pause=()=>{if(document.hidden){session.stop();setActive(false);setStatus('Camera paused');}};
  document.addEventListener('visibilitychange',pause);
  return()=>{document.removeEventListener('visibilitychange',pause);session.stop();};
 },[active]);
 async function scanImage(event){
  const file=event.target.files?.[0];if(!file)return;
  setActive(false);setScanError('');setCameraError('');setStatus('Reading QR image...');setMarking(true);
  const url=URL.createObjectURL(file);
  try{const {BrowserQRCodeReader}=await import('@zxing/browser');const decoded=await new BrowserQRCodeReader().decodeFromImageUrl(url);await scanned(decoded.getText());}catch{setScanError('No readable QR code found in this image.');setStatus('');setMarking(false);}finally{URL.revokeObjectURL(url);event.target.value='';}
 }
 function restart(){setResult(null);setScanError('');setCameraError('');setStatus('Opening camera...');setActive(true);}
 const member=result?.member;
 return <section className="scanner-main" aria-label="QR scanner"><div className="camera-preview"><video ref={video} autoPlay playsInline muted aria-label="QR scanner camera"/>{active&&<div className="scan-guide" aria-hidden="true"/>}{active&&status==='Scanning...'&&<span className="scanner-live-label">Live camera</span>}{!active&&<div className="camera-idle" aria-hidden="true">{result?.markedPresent?'Present':'QR'}</div>}</div><div className="scanner-status" role="status">{!result&&!cameraError&&status}</div>{cameraError&&<p className="error" role="alert">{cameraError}</p>}{scanError&&<p className="error" role="alert">{scanError}</p>}{member&&<section className="scan-result gate-pass-scan-result" aria-label="Scan result">{member.profilePictureUrl&&<img src={member.profilePictureUrl} alt={member.name}/>}<h2>{member.name}</h2><p>{member.memberId} / {member.plan}</p><p>{member.validFrom} to {member.validTo}</p><span className="badge">{result.markedPresent?'Present':result.membershipStatus}</span>{!result.markedPresent&&<p className="renewal-message">{result.renewalMessage}</p>}</section>}<button className="scanner-action" disabled={marking} onClick={active?()=>{setActive(false);setStatus('Camera paused');}:restart}>{active?'Stop scanner':result?'Scan next QR':'Open scanner'}</button><input ref={fileInput} type="file" accept="image/*" aria-label="QR image" hidden onChange={scanImage}/><button type="button" className="secondary scanner-image-button" disabled={marking} onClick={()=>fileInput.current.click()}>Scan QR Image</button></section>;
}
