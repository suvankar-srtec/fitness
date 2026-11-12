'use client';
import {useEffect,useRef,useState} from 'react';
import {cameraErrorMessage,startQrCamera} from '../../lib/qr-scanner.mjs';
import {scanTimingMessage} from '../../lib/scan-timing.mjs';
import {requestApi} from '../../lib/api-client.mjs';
export default function SupervisorScanner({onAttendanceMarked}) {
 const resultCard=useRef(null),processing=useRef(false),nextScanAt=useRef(0);
 const video=useRef(null),fileInput=useRef(null),scanRun=useRef(0),onMarked=useRef(onAttendanceMarked);
 useEffect(()=>{onMarked.current=onAttendanceMarked;},[onAttendanceMarked]);
 const [expiryNotice,setExpiryNotice]=useState(null);
 const [active,setActive]=useState(true),[status,setStatus]=useState('Opening camera...'),[cameraError,setCameraError]=useState(''),[result,setResult]=useState(null),[marking,setMarking]=useState(false),[scanError,setScanError]=useState('');
 useEffect(()=>()=>{scanRun.current++;},[]);
 async function scanned(text){
  if(processing.current||Date.now()<nextScanAt.current)return;processing.current=true;
  setCameraError('');setScanError('');setResult(null);
  const run=++scanRun.current;setMarking(true);setStatus('Marking attendance...');
  try{const data=await requestApi('gate-pass-scan','POST',{qr:text});if(data.markedPresent&&typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('gym-attendance-updates');channel.postMessage({date:data.date});channel.close();}if(run!==scanRun.current)return;if(data.markedPresent)onMarked.current?.(data);setResult(data);if(data.membershipStatus==='Expired')setExpiryNotice({phone:data.gymPhone||''});setStatus(data.markedPresent?(data.alreadyPresent?'Already marked present today':'Marked present'):data.membershipStatus==='Expired'?'Membership expired':'Gate pass is not active');}
  catch(error){if(run===scanRun.current){setScanError(error.message);setStatus('');}}
  finally{nextScanAt.current=Date.now()+2500;processing.current=false;if(run===scanRun.current)setMarking(false);}
 }
 useEffect(()=>{
  if(!active||document.hidden||expiryNotice)return;
  if(!window.isSecureContext){setCameraError('Camera access requires HTTPS.');setActive(false);return;}
  if(!navigator.mediaDevices?.getUserMedia){setCameraError('Camera is not supported in this browser.');setActive(false);return;}
  const session=startQrCamera({continuous:true,video:video.current,getMedia:constraints=>navigator.mediaDevices.getUserMedia(constraints),loadReader:async()=>{const {BrowserQRCodeReader}=await import('@zxing/browser');return new BrowserQRCodeReader();},onReady:()=>setStatus('Scanning...'),onResult:scanned,onError:error=>{setCameraError(cameraErrorMessage(error));setActive(false);}});
  const pause=()=>{if(document.hidden){session.stop();setActive(false);setStatus('Camera paused');}};
  document.addEventListener('visibilitychange',pause);
  return()=>{document.removeEventListener('visibilitychange',pause);session.stop();};
 },[active,expiryNotice]);
 async function scanImage(event){
  const file=event.target.files?.[0];if(!file)return;
  setActive(false);setScanError('');setCameraError('');setStatus('Reading QR image...');setMarking(true);
  const url=URL.createObjectURL(file);
  try{const {BrowserQRCodeReader}=await import('@zxing/browser');const decoded=await new BrowserQRCodeReader().decodeFromImageUrl(url);await scanned(decoded.getText());}catch{setScanError('No readable QR code found in this image.');setStatus('');setMarking(false);}finally{URL.revokeObjectURL(url);event.target.value='';}
 }
 useEffect(()=>{
  if(marking||cameraError||expiryNotice||(!result&&!scanError))return;
  const timer=setTimeout(()=>{if(!document.hidden){setResult(null);setScanError('');setStatus('Scanning...');setActive(true);}},2500);
  return()=>clearTimeout(timer);
 },[active,marking,cameraError,result,scanError,expiryNotice]);
 useEffect(()=>{
  const resume=()=>{if(!document.hidden&&!processing.current&&!expiryNotice){setCameraError('');setStatus('Opening camera...');setActive(true);}};
  document.addEventListener('visibilitychange',resume);
  return()=>document.removeEventListener('visibilitychange',resume);
 },[expiryNotice]);
 useEffect(()=>{
  if(!result?.member||!window.matchMedia('(max-width:700px)').matches)return;
  const frame=requestAnimationFrame(()=>{
   const header=document.querySelector('.app > .sidebar')?.getBoundingClientRect();
   const offset=header&&header.top<=0&&header.height<window.innerHeight/2?header.height:0;
   if(resultCard.current){resultCard.current.style.scrollMarginTop=(offset+12)+'px';resultCard.current.scrollIntoView({block:'start',behavior:'smooth'});}
  });return()=>cancelAnimationFrame(frame);
 },[result]);
 const member=result?.member;
 return <section className="scanner-main" aria-label="QR scanner"><div className="camera-preview"><video ref={video} autoPlay playsInline muted aria-label="QR scanner camera"/>{active&&<div className="scan-guide" aria-hidden="true"/>}{active&&status==='Scanning...'&&<span className="scanner-live-label">Live camera</span>}{(!active||(!marking&&(result||scanError)))&&<div className="camera-idle">{(result||scanError)?<img className="scanner-result-image" src={result?.markedPresent?'/scan-success.svg':'/scan-denied.svg'} alt={result?.markedPresent?'Present ? check-in successful':'Entry denied'}/>:<span aria-hidden="true">QR</span>}</div>}</div>{marking&&<span className="scanner-processing" role="status">Checking membership?</span>}<div className="scanner-status" role="status">{!result&&!cameraError&&status}</div>{cameraError&&<div className="scanner-camera-error"><p className="error" role="alert">{cameraError}</p><button type="button" className="secondary" onClick={()=>{setCameraError('');setStatus('Opening camera...');setActive(true);}}>Retry camera</button></div>}{scanError&&<p className="error" role="alert">{scanError}</p>}{member&&<section ref={resultCard} className="scan-result gate-pass-scan-result" aria-label="Scan result" aria-live="polite"><div className="scan-member-identity">{member.profilePictureUrl&&<img src={member.profilePictureUrl} alt={member.name}/>}<div><h2>{member.name}</h2><p>{member.memberId} / {member.plan}</p></div></div>{!member.staff&&<p>{member.validFrom} to {member.validTo}</p>}<span className={result.markedPresent?'attendance-pill attendance-present':'badge'}>{result.markedPresent?'Present':result.membershipStatus}</span>{result.markedPresent&&scanTimingMessage(result)&&<p role="status">{scanTimingMessage(result)}</p>}{!result.markedPresent&&<p className="renewal-message">{result.renewalMessage}</p>}</section>}<>{expiryNotice&&<div className="modal-overlay"><section className="modal-card scan-expired-popup" role="alertdialog" aria-modal="true" aria-labelledby="expiredPlanTitle"><h2 id="expiredPlanTitle">Last plan expired</h2><p>Contact us{expiryNotice.phone?<>: <a href={'tel:'+expiryNotice.phone}>{expiryNotice.phone}</a></>:null}</p><button type="button" autoFocus onClick={()=>setExpiryNotice(null)}>OK</button></section></div>}</><input ref={fileInput} type="file" accept="image/*" aria-label="QR image" hidden onChange={scanImage}/><button type="button" className="secondary scanner-image-button" disabled={marking} onClick={()=>fileInput.current.click()}>Scan QR Image</button></section>;
}
