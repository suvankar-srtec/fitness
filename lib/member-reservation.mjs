// Kept in the signed-in workspace only, never persisted to browser storage.
export function reserveMemberId(resource,request,now=Date.now()){
 const cached=resource.current;
 if(cached&&cached.expiresAt>now)return cached.promise;
 const entry={expiresAt:now+110*60*1000,promise:null};
 entry.promise=Promise.resolve().then(()=>request('member-registration','POST')).then(value=>{
  if(value.expiresAt){const expiry=Date.parse(value.expiresAt);if(Number.isFinite(expiry))entry.expiresAt=expiry-30000;}
  return value;
 }).catch(error=>{if(resource.current===entry)resource.current=null;throw error;});
 resource.current=entry;
 return entry.promise;
}
