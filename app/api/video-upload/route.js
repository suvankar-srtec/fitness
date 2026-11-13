import {handleUploadPresigned} from '@vercel/blob/client';
import {issueSignedToken} from '@vercel/blob';
import {database} from '../../../lib/db';
import {videoUploader,finalizeVideo} from '../../../lib/video-api';
import {canManageVideo,VIDEO_TYPES,MAX_VIDEO_BYTES} from '../../../lib/videos.mjs';
import {withAuditActor} from '../../../lib/audit-database.mjs';
export const runtime='nodejs';
export async function POST(request){try{
 if(!process.env.BLOB_READ_WRITE_TOKEN&&!process.env.BLOB_STORE_ID)return Response.json({error:'Connect a Private Vercel Blob store to enable uploads'},{status:503});
 const body=await request.json(),sql=database();
 const result=await handleUploadPresigned({request,body,getSignedToken:async(pathname)=>{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw Error('Invalid origin');
  const user=await videoUploader(request,sql);if(!user)throw Error('Gym admin login required');
  const [row]=await sql`SELECT * FROM gym_videos WHERE pathname=${pathname} AND uploaded_by=${user.id} AND status='pending' AND archived_at IS NULL AND created_at>NOW()-INTERVAL '1 hour'`;
  if(!row||!canManageVideo(user,row))throw Error('Upload not authorized');
  const validUntil=Date.now()+60*60*1000,maximumSizeInBytes=Math.min(Number(row.size),MAX_VIDEO_BYTES);
  return {token:await issueSignedToken({pathname,operations:['put'],allowedContentTypes:[row.content_type],maximumSizeInBytes,validUntil}),urlOptions:{allowedContentTypes:[row.content_type],maximumSizeInBytes,addRandomSuffix:false,allowOverwrite:false,validUntil,tokenPayload:JSON.stringify({id:row.id,userId:user.id})}};
 },onUploadCompleted:async({blob,tokenPayload})=>{
  const payload=JSON.parse(tokenPayload||'{}');if(!/^[a-f0-9-]{36}$/.test(payload.id||''))throw Error('Invalid upload callback');
  const [row]=await sql`SELECT v.pathname,u.* FROM gym_videos v JOIN users u ON u.id=v.uploaded_by WHERE v.id=${payload.id} AND v.uploaded_by=${payload.userId} AND gym_account_enabled(u.id) AND gym_subscription_active(v.admin_id)`;
  if(!row||row.pathname!==blob.pathname)throw Error('Upload no longer authorized');await finalizeVideo(payload.id,withAuditActor(sql,row));
 }});return Response.json(result);
 }catch{return Response.json({error:'Video upload could not be completed. Check your file and storage connection.'},{status:400});}}
