import {NextResponse} from 'next/server.js';
import {normalizeMemberPicture} from './member-picture.mjs';
import {sessionProfile} from './session-profile.mjs';
export async function gymLogoApi(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(user.role!=='admin')return reply({error:'Only gym admins can update their gym logo'},403);
 if(request.method!=='PATCH')return reply({error:'Method not allowed'},405);
 const body=await request.json(),logo=await normalizeMemberPicture(body.gymLogo);
 if(!logo)return reply({error:'Upload a gym logo'},400);
 const [updated]=await sql`UPDATE users SET gym_logo=${'data:image/jpeg;base64,'+logo} WHERE id=${user.id} AND role='admin' AND archived_at IS NULL RETURNING *`;
 return updated?reply(sessionProfile(updated)):reply({error:'Gym account not found'},404);
}
