import {notifyWorkspaceChange} from './workspace-updates.mjs';
async function performRequest(path,method='GET',data,{fetcher=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
 const reservation=['member-registration','manager-registration'].includes(path.split('?')[0]);
 const tries=method==='GET'||reservation?3:1;
 for(let attempt=0;attempt<tries;attempt++){
  let response;
  try{response=await fetcher('/api/'+path,{method,cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:data!==undefined?JSON.stringify(data):reservation?'{}':undefined,...((method==='GET'||reservation||method==='POST'&&['admins','managers','supervisors','members'].includes(path))?{signal:AbortSignal.timeout(method==='GET'?15000:reservation?12000:30000)}:{})});}
  catch(error){if(attempt+1<tries){await wait(500*(attempt+1));continue;}throw new Error('Connection failed. Please retry.');}
  if([502,503,504].includes(response.status)&&attempt+1<tries){await wait(500*(attempt+1));continue;}
  const result=await response.json();
  if(!response.ok){if(['MEMBERSHIP_EXPIRED','MEMBER_INACTIVE'].includes(result.code)&&!['login','member-login'].includes(path.split('?')[0])&&typeof window!=='undefined'){window.alert(result.error);window.dispatchEvent(new Event('gym-session-expired'));}if(response.status===401&&!['login','member-login'].includes(path.split('?')[0])&&typeof window!=='undefined')window.dispatchEvent(new Event('gym-session-expired'));const error=new Error(result.error||'Request failed. Please retry.');error.status=response.status;error.code=result.code;throw error;}
  return result;
 }
}

// Share concurrent browser reads only; never cache account data or retry writes.
const pendingReads=new Map();
export function requestApi(path,method='GET',data,options){
 if(method!=='GET'||options||typeof window==='undefined')return performRequest(path,method,data,options).then(result=>{if(method!=='GET'&&!['login','logout','member-login','member-registration','manager-registration'].includes(path.split('?')[0])&&!path.includes('otp-'))notifyWorkspaceChange();return result;});
 if(pendingReads.has(path))return pendingReads.get(path);
 const pending=performRequest(path,method,data).finally(()=>pendingReads.delete(path));
 pendingReads.set(path,pending);return pending;
}
