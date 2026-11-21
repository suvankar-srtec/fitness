function failure(message,status,code){return Object.assign(new Error(message),{status,code});}
export async function readStartup(onProfile,{fetcher=fetch,signal}={}){
 try{
  const response=await fetcher('/api/startup',{credentials:'same-origin',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(18000)]):AbortSignal.timeout(18000)});
  if(!response.ok){const data=await response.json();throw failure(data.error||'Unable to open your workspace.',response.status,data.code);}
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',profile=null,workspace=null;
  const accept=line=>{if(!line.trim())return;const message=JSON.parse(line);if(message.type==='profile'){profile=message.data;onProfile(profile);}else if(message.type==='workspace')workspace=message.data;else if(message.type==='error')throw failure(message.error,message.status,message.code);};
  try{while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value||new Uint8Array(),{stream:!done});let newline;while((newline=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);accept(line);}if(done)break;}if(buffer.trim())accept(buffer);}finally{reader.releaseLock();}
  if(!profile)throw failure('Unable to read your session. Please retry.',503,'INVALID_RESPONSE');
  return {profile,workspace};
 }catch(error){
  if(error.status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('gym-session-expired'));
  if(!error.status&&error.name!=='AbortError')error=failure('Unable to connect to the server. Please retry.',503,'NETWORK_ERROR');
  if(error.status>=500&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('gym-connection-issue',{detail:{reason:error.code||'SERVICE_UNAVAILABLE'}}));
  throw error;
 }
}
