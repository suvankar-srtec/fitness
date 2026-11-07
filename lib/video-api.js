import {NextResponse} from 'next/server.js';
import {randomUUID} from 'node:crypto';
import {head,get} from '@vercel/blob';
import {VIDEO_TYPES,validateVideo,videoScope,canWatchVideo,canManageVideo,videoResponse} from './videos.mjs';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function finalizeVideo(id,sql,{inspect=head}={}){const [row]=await sql`SELECT v.*,u.role,u.created_by,u.location_id AS staff_location_id FROM gym_videos v JOIN users u ON u.id=v.uploaded_by WHERE v.id=${id} AND v.archived_at IS NULL AND gym_account_enabled(u.id)`;if(!row)throw Error('Upload no longer available');if(!(row.role==='admin'&&row.uploaded_by===row.admin_id||row.role==='manager'&&row.created_by===row.admin_id&&row.staff_location_id===row.location_id))throw Error('Upload no longer authorized');if(row.status==='ready')return;
 const blob=await inspect(row.pathname);if(blob.pathname!==row.pathname||!VIDEO_TYPES[blob.contentType]||blob.contentType!==row.content_type||Number(blob.size)!==Number(row.size))throw Error('Uploaded video does not match the selected file');
 await sql`UPDATE gym_videos SET status='ready' WHERE id=${id} AND archived_at IS NULL`;
}
export async function videoApi(action,request,user,sql,{read=get,inspect=head,configured=!!(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID)}={}){
 const scope=videoScope(user);if(!scope)return reply({error:'Video access denied'},403);
 if(action==='videos'&&request.method==='GET'){const rows=await sql`SELECT id,admin_id,location_id,uploaded_by,name,content_type,size,status,created_at FROM gym_videos WHERE admin_id=${scope.gymId} AND archived_at IS NULL AND status='ready' AND (${user.role==='admin'} OR location_id IS NULL OR location_id=${scope.locationId}) ORDER BY created_at DESC`;return reply(rows.map(row=>({...row,canDelete:canManageVideo(user,row),streamUrl:'/api/video-stream?id='+row.id})));}
 const id=action==='video-stream'?new URL(request.url).searchParams.get('id'):null;
 if(action==='video-stream'){if(request.method!=='GET')return reply({error:'Method not allowed'},405);if(!/^[a-f0-9-]{36}$/.test(id||''))return reply({error:'Video not found'},404);const [row]=await sql`SELECT * FROM gym_videos WHERE id=${id}`;if(!row||!canWatchVideo(user,row))return reply({error:'Video not found'},404);const range=request.headers.get('range');if(range&&!/^bytes=\d*-\d*$/.test(range))return reply({error:'Invalid byte range'},416);return videoResponse(await read(row.pathname,{access:'private',headers:range?{range}:undefined,abortSignal:request.signal}));}
 if(!['admin','manager'].includes(user.role))return reply({error:'Only gym admins can upload videos'},403);
 if(!['POST','PATCH','DELETE'].includes(request.method))return reply({error:'Method not allowed'},405);
 const body=await request.json();
 if(request.method==='POST'){if(!configured)return reply({error:'Video storage is not connected. Connect a Private Vercel Blob store to this project.'},503);const error=validateVideo(body);if(error)return reply({error},400);const id=randomUUID(),pathname='gym-videos/'+scope.gymId+'/'+id+'.'+VIDEO_TYPES[body.contentType];const [created]=await sql`INSERT INTO gym_videos(id,admin_id,location_id,uploaded_by,name,pathname,content_type,size) SELECT ${id},${scope.gymId},${scope.locationId},${user.id},${body.name.trim()},${pathname},${body.contentType},${body.size} WHERE (SELECT count(*) FROM gym_videos WHERE uploaded_by=${user.id} AND status='pending' AND created_at>NOW()-INTERVAL '1 hour' AND archived_at IS NULL)<5 RETURNING id,pathname`;return created?reply(created,201):reply({error:'Finish an existing upload or try again later'},429);}
 if(!/^[a-f0-9-]{36}$/.test(body.id||''))return reply({error:'Video not found'},404);const [row]=await sql`SELECT * FROM gym_videos WHERE id=${body.id} AND archived_at IS NULL`;if(!row||!canManageVideo(user,row))return reply({error:'Video not found'},404);
 if(request.method==='DELETE'){await sql`UPDATE gym_videos SET archived_at=NOW() WHERE id=${row.id}`;return reply({ok:true});}
 await finalizeVideo(row.id,sql,{inspect});return reply({ok:true});
}
export async function videoUploader(request,sql){const token=request.cookies.get('session')?.value;if(!token||token.startsWith('m.'))return null;const {tokenHash}=await import('./password.mjs');const [user]=await sql`SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=${tokenHash(token)} AND s.expires_at>NOW() AND u.password_ready=TRUE AND gym_account_enabled(u.id) AND u.role IN ('admin','manager')`;return user||null;}
