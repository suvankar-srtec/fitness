import {NextResponse} from 'next/server.js';
import {resolveSessionAccess} from './session-read-api.js';
import {workspaceApi} from './workspace-api.js';
export async function startupApi(request,sql){
 const started=performance.now(),session=await resolveSessionAccess(request,sql);
 if(session.error){const {status,...body}=session;return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});}
 const {user,profile}=session,encoder=new TextEncoder();let cancelled=false;
 const stream=new ReadableStream({
  async start(controller){
   const emit=message=>{if(!cancelled)controller.enqueue(encoder.encode(JSON.stringify(message)+'\n'));};
   emit({type:'profile',data:profile});
   try{
    if(['admin','manager','superadmin'].includes(user.role)){
     // Reuse this request's authorized identity instead of another session query.
     const response=await workspaceApi(request,user,sql),data=await response.json();
     emit(response.ok?{type:'workspace',data}:{type:'error',error:data.error,status:response.status,code:data.code});
    }
   }catch{emit({type:'error',error:'Unable to load workspace data. Please retry.',status:503});}
   finally{if(!cancelled)controller.close();}
  },cancel(){cancelled=true;}
 });
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'private, no-store','X-Accel-Buffering':'no','Server-Timing':'session;dur='+(performance.now()-started).toFixed(1)}});
}
