export async function requestApi(path,method='GET',data,{fetcher=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
 const tries=method==='GET'?3:1;
 for(let attempt=0;attempt<tries;attempt++){
  let response;
  try{response=await fetcher('/api/'+path,{method,cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});}
  catch(error){if(attempt+1<tries){await wait(500*(attempt+1));continue;}throw new Error('Connection failed. Please retry.');}
  if([502,503,504].includes(response.status)&&attempt+1<tries){await wait(500*(attempt+1));continue;}
  const result=await response.json();
  if(!response.ok){if(['MEMBERSHIP_EXPIRED','MEMBER_INACTIVE'].includes(result.code)&&!['login','member-login'].includes(path.split('?')[0])&&typeof window!=='undefined'){window.alert(result.error);window.dispatchEvent(new Event('gym-session-expired'));}if(response.status===401&&!['login','member-login'].includes(path.split('?')[0])&&typeof window!=='undefined')window.dispatchEvent(new Event('gym-session-expired'));const error=new Error(result.error||'Request failed. Please retry.');error.status=response.status;error.code=result.code;throw error;}
  return result;
 }
}
