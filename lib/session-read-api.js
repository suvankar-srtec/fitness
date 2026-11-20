import {NextResponse} from 'next/server.js';
import {staffSessionRecord,memberSessionRecord,staffSessionError} from './session-records.mjs';
import {sessionProfile} from './session-profile.mjs';
import {memberProfile,memberAccessError} from './member-access.mjs';
import {isTrainer} from './trainer-access.mjs';
import {workspaceApi} from './workspace-api.js';
export async function sessionReadApi(request,sql,{workspace=false}={}){
 const started=performance.now();
 const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Server-Timing':'session;dur='+(performance.now()-started).toFixed(1)}});
 const token=request.cookies.get('session')?.value;
 if(!token)return reply({error:'Please sign in'},401);
 if(token.startsWith('m.')){
  const m=await memberSessionRecord(sql,token);
  if(!m)return reply({error:'Please sign in'},401);
  if(m.subscription_active===false)return reply({error:'Organization subscription is not active. Contact your organization.',code:'SUBSCRIPTION_EXPIRED'},403);
  const denied=memberAccessError(m);if(denied)return reply(denied,403);
  if(workspace)return reply({error:'Member access is limited to your own pass'},403);
  return reply(memberProfile(m));
 }
 const u=await staffSessionRecord(sql,token),denied=staffSessionError(u);
 if(denied){const {status,...body}=denied;return reply(body,status);}
 if(workspace&&isTrainer(u))return reply({error:'Trainer access is limited to assigned members and QR passes'},403);
 if(u.role==='manager'&&!u.location_id)return reply({error:'Assigned location required'},403);
 if(!workspace)return reply(sessionProfile(u));
 const sessionMs=performance.now()-started;
 const response=await workspaceApi(request,u,sql);
 response.headers.set('Server-Timing','session;dur='+sessionMs.toFixed(1)+', '+response.headers.get('Server-Timing'));
 return response;
}
