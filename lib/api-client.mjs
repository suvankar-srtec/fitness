import {beginLoading} from './loading-state.mjs';
import {notifyWorkspaceChange} from './workspace-updates.mjs';
async function performRequestRaw(path,method='GET',data,{fetcher=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),silent=false}={}) {
 const reservation=['member-registration','manager-registration'].includes(path.split('?')[0]);
 // Automatic dashboard refreshes must not occupy the network for multiple retry cycles.
 const tries=method==='GET'&&silent?1:method==='GET'||reservation?3:1;
 for(let attempt=0;attempt<tries;attempt++){
  let response;
  try{response=await fetcher('/api/'+path,{method,cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:data!==undefined?JSON.stringify(data):reservation?'{}':undefined,...((method==='GET'||reservation||method==='POST'&&['admins','employees','managers','supervisors','members'].includes(path))?{signal:AbortSignal.timeout(method==='GET'?(silent?10000:15000):reservation?12000:30000)}:{})});}
  catch(error){if(attempt+1<tries){await wait(500*(attempt+1));continue;}throw new Error('Connection failed. Please retry.');}
  if([502,503,504].includes(response.status)&&attempt+1<tries){await wait(500*(attempt+1));continue;}
  let result;
  try{
   result=await response.json();
   if(result===null||typeof result!=='object')throw new Error('Invalid response');
  }catch{
   if(response.status!==401&&attempt+1<tries){await wait(500*(attempt+1));continue;}
   if(response.status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('gym-session-expired'));
   const error=new Error(method==='GET'?'Unable to read the server response. Please refresh and try again.':'The server response was interrupted. Refresh the list to check whether the record was saved before trying again.');
   error.status=response.status;error.code='INVALID_RESPONSE';throw error;
  }
  if(!response.ok){if(['MEMBERSHIP_EXPIRED','MEMBER_INACTIVE','SUBSCRIPTION_EXPIRED'].includes(result.code)&&!['login','member-login'].includes(path.split('?')[0])&&typeof window!=='undefined'){window.alert(result.error);window.dispatchEvent(new Event('gym-session-expired'));}if(response.status===401&&!['login','member-login'].includes(path.split('?')[0])&&typeof window!=='undefined')window.dispatchEvent(new Event('gym-session-expired'));const error=new Error(result.error||'Request failed. Please retry.');error.status=response.status;error.code=result.code;throw error;}
  return result;
 }
}

// Share concurrent reads while tracking loading per caller, so background reads
// stay silent and a foreground caller joining the same read still shows progress.
const pendingReads=new Map();
export function requestApi(path,method='GET',data,options){
 const done=options?.silent?()=>{}:beginLoading();
 let request;
 const customOptions=options&&Object.keys(options).some(key=>key!=='silent');
 if(method!=='GET'||customOptions||typeof window==='undefined'){
  request=performRequestRaw(path,method,data,options).then(result=>{if(method!=='GET')pendingReads.clear();if(method!=='GET'&&!['login','logout','member-login','member-registration','manager-registration'].includes(path.split('?')[0])&&!path.includes('otp-'))notifyWorkspaceChange();return result;});
 }else{
  request=pendingReads.get(path);
  if(!request){request=performRequestRaw(path,method,data,options).finally(()=>{if(pendingReads.get(path)===request)pendingReads.delete(path);});pendingReads.set(path,request);}
 }
 return request.finally(done);
}
