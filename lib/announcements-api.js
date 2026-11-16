import {NextResponse} from 'next/server.js';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function announcementAttachment(file){
 if(!file)return {name:'',type:'',data:''};
 if(typeof file.name!=='string'||file.name.length>200||typeof file.data!=='string'||file.data.length>2900000)throw Error('Upload an image or PDF up to 2 MB.');
 if(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(file.data)){
  const bytes=Buffer.from(file.data.slice(file.data.indexOf(',')+1),'base64');if(bytes.length>2*1024*1024)throw Error('Upload an image up to 2 MB.');
  try{const {default:sharp}=await import('sharp');const image=await sharp(bytes,{limitInputPixels:20000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();if(image.length>2*1024*1024)throw Error('Too large');return {name:file.name,type:'image/jpeg',data:image.toString('base64')};}catch{throw Error('Upload a valid image up to 2 MB.');}
 }
 const match=/^data:application\/pdf;base64,([A-Za-z0-9+/]+=*)$/.exec(file.data);
 if(!match)throw Error('Upload a JPEG, PNG, WebP image or PDF.');
 const bytes=Buffer.from(match[1],'base64');if(bytes.length>2*1024*1024||bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Upload a valid PDF up to 2 MB.');
 return {name:file.name,type:'application/pdf',data:bytes.toString('base64')};
}
export async function announcementsApi(action,request,user,sql){
 const member=user.role==='member',admin=user.role==='admin',manager=user.role==='manager';
 if(!member&&!admin&&!manager)return reply({error:'Access denied'},403);
 const gym=admin?user.id:member?user.admin_id:user.created_by,branch=admin?null:user.location_id;
 if(!Number.isInteger(gym)||gym<1||manager&&(!Number.isInteger(branch)||branch<1))return reply({error:'Assigned organization and location required'},403);
 if(action==='announcement-file'){
  if(request.method!=='GET')return reply({error:'Method not allowed'},405);
  const id=Number(new URL(request.url).searchParams.get('id'));if(!Number.isInteger(id)||id<1)return reply({error:'Attachment not found'},404);
  const [file]=await sql`SELECT file_type,file_data FROM announcements WHERE id=${id} AND admin_id=${gym} AND archived_at IS NULL AND (${admin} OR location_id IS NULL OR location_id=${branch||null}) AND file_data<>''`;
  if(!file)return reply({error:'Attachment not found'},404);
  return new NextResponse(Buffer.from(file.file_data,'base64'),{headers:{'Content-Type':file.file_type,'Content-Disposition':file.file_type==='application/pdf'?'attachment; filename="announcement-'+id+'.pdf"':'inline','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(request.method==='GET')return reply(await sql`SELECT a.id,a.title,a.message,a.location_id AS "locationId",l.name AS "locationName",a.created_at AS "createdAt",a.updated_at AS "updatedAt",a.file_name AS "fileName",a.file_type AS "fileType",CASE WHEN a.file_data<>'' THEN '/api/announcement-file?id='||a.id ELSE NULL END AS "fileUrl",(${admin} OR ${manager} AND a.created_by=${user.id} AND a.location_id=${branch||null}) AS "canManage" FROM announcements a LEFT JOIN gym_locations l ON l.id=a.location_id WHERE a.admin_id=${gym} AND a.archived_at IS NULL AND (${admin} OR a.location_id IS NULL OR a.location_id=${branch||null}) ORDER BY a.id DESC LIMIT 100`);
 if(member)return reply({error:'Announcements are read-only'},403);
 if(!['POST','PATCH','DELETE'].includes(request.method))return reply({error:'Method not allowed'},405);
 const body=await request.json(),id=Number(body.id);
 if(request.method!=='POST'&&(!Number.isInteger(id)||id<1))return reply({error:'Announcement not found'},404);
 if(request.method==='DELETE'){
  const rows=await sql`UPDATE announcements SET archived_at=now(),updated_at=now() WHERE id=${id} AND admin_id=${gym} AND archived_at IS NULL AND (${admin} OR location_id=${branch} AND created_by=${user.id}) RETURNING id`;
  return rows.length?reply({ok:true}):reply({error:'Announcement not found'},404);
 }
 const title=typeof body.title==='string'?body.title.trim():'',message=typeof body.message==='string'?body.message.trim():'';
 if(!title||title.length>120||message.length>5000)return reply({error:'Enter a title up to 120 characters and a message up to 5000 characters.'},400);
 const location=manager?branch:body.locationId?Number(body.locationId):null;
 if(location!==null){if(!Number.isInteger(location)||location<1)return reply({error:'Select a valid location'},400);const [valid]=await sql`SELECT id FROM gym_locations WHERE id=${location} AND admin_id=${gym}`;if(!valid)return reply({error:'Select a location in your organization'},403);}
 if(manager&&body.locationId&&Number(body.locationId)!==branch)return reply({error:'Announcements are limited to your assigned location'},403);
 let attachment;try{attachment=await announcementAttachment(body.attachment);}catch(error){return reply({error:error.message==='INVALID_PICTURE'?'Upload a valid image up to 2 MB.':error.message},400);}
 const changeAttachment=body.attachment!==undefined||body.removeAttachment===true;
 if(request.method==='POST'){
  const [row]=await sql`INSERT INTO announcements(admin_id,location_id,created_by,title,message,file_name,file_type,file_data) VALUES(${gym},${location},${user.id},${title},${message},${attachment.name},${attachment.type},${attachment.data}) RETURNING id`;
  return reply(row,201);
 }
 const rows=await sql`UPDATE announcements SET title=${title},message=${message},location_id=${location},file_name=CASE WHEN ${changeAttachment} THEN ${attachment.name} ELSE file_name END,file_type=CASE WHEN ${changeAttachment} THEN ${attachment.type} ELSE file_type END,file_data=CASE WHEN ${changeAttachment} THEN ${attachment.data} ELSE file_data END,updated_at=now() WHERE id=${id} AND admin_id=${gym} AND archived_at IS NULL AND (${admin} OR location_id=${branch} AND created_by=${user.id}) RETURNING id`;
 return rows.length?reply(rows[0]):reply({error:'Announcement not found'},404);
}
