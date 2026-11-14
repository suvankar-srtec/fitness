import {gymWorkspaceScope} from './gym-workspace-scope.mjs';
import {NextResponse} from 'next/server.js';
import {normalizeMemberPicture} from './member-picture.mjs';
import {sessionProfile} from './session-profile.mjs';
export async function gymLogoApi(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!gymWorkspaceScope(user))return reply({error:'Only organization admins can update their organization logo'},403);
 if(request.method!=='PATCH')return reply({error:'Method not allowed'},405);
 const body=await request.json(),logo=await normalizeMemberPicture(body.gymLogo);
 if(!logo)return reply({error:'Upload a organization logo'},400);
 const [updated]=await sql`UPDATE users SET gym_logo=${'data:image/jpeg;base64,'+logo} WHERE id=${user.role==='manager'?user.created_by:user.id} AND role='admin' AND archived_at IS NULL RETURNING *`;
 return updated?reply(user.role==='manager'?{...sessionProfile(user),gymLogo:updated.gym_logo}:sessionProfile(updated)):reply({error:'Organization account not found'},404);
}
