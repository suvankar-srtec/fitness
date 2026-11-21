import {NextResponse} from 'next/server.js';
import {staffSessionRecord,memberSessionRecord,staffSessionError} from './session-records.mjs';
import {sessionProfile} from './session-profile.mjs';
import {memberProfile,memberAccessError} from './member-access.mjs';
import {isTrainer} from './trainer-access.mjs';
import {workspaceApi} from './workspace-api.js';
// Fresh database authorization shared by ordinary and progressive startup reads.
export async function resolveSessionAccess(request,sql){
 const token=request.cookies.get('session')?.value;
 if(!token)return {error:'Please sign in',status:401};
 if(token.startsWith('m.')){
  const m=await memberSessionRecord(sql,token);if(!m)return {error:'Please sign in',status:401};
  if(m.subscription_active===false)return {error:'Organization subscription is not active. Contact your organization.',code:'SUBSCRIPTION_EXPIRED',status:403};
  const denied=memberAccessError(m);if(denied)return {...denied,status:403};
  return {user:{...m,role:'member'},profile:memberProfile(m)};
 }
 const user=await staffSessionRecord(sql,token),denied=staffSessionError(user);if(denied)return denied;
 if(user.role==='manager'&&!user.location_id)return {error:'Assigned location required',status:403};
 return {user,profile:sessionProfile(user)};
}
export async function sessionReadApi(request,sql,{workspace=false}={}){
 const started=performance.now();
 const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Server-Timing':'session;dur='+(performance.now()-started).toFixed(1)}});
 const session=await resolveSessionAccess(request,sql);
 if(session.error){const {status,...body}=session;return reply(body,status);}
 const {user,profile}=session;
 if(!workspace)return reply(profile);
 if(user.role==='member')return reply({error:'Member access is limited to your own pass'},403);
 if(isTrainer(user))return reply({error:'Trainer access is limited to assigned members and QR passes'},403);
 const sessionMs=performance.now()-started,response=await workspaceApi(request,user,sql);
 response.headers.set('Server-Timing','session;dur='+sessionMs.toFixed(1)+', '+response.headers.get('Server-Timing'));
 return response;
}
