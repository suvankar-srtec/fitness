import {NextResponse} from 'next/server.js';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function memberQueriesApi(req,u,sql){
 if(!['admin','member'].includes(u.role))return reply({error:'Access denied'},403);
 if(req.method==='GET'&&u.role==='admin'){
  if(new URL(req.url).searchParams.has('unread')){const [row]=await sql`SELECT count(*)::int AS count FROM member_queries WHERE admin_id=${u.id} AND read_at IS NULL`;return reply(row);}
  return reply(await sql`SELECT q.id,q.message,q.created_at,q.read_at,m.name,m.public_id FROM member_queries q JOIN members m ON m.id=q.member_id WHERE q.admin_id=${u.id} ORDER BY q.created_at DESC,q.id DESC LIMIT 200`);
 }
 if(req.method==='POST'&&u.role==='member'){
  const b=await req.json();if(typeof b.message!=='string'||!b.message.trim()||b.message.trim().length>2000)return reply({error:'Enter a query up to 2000 characters'},400);
  const [row]=await sql`INSERT INTO member_queries(admin_id,member_id,message) VALUES(${u.admin_id},${u.id},${b.message.trim()}) RETURNING id`;return reply(row,201);
 }
 if(req.method==='PATCH'&&u.role==='admin'){
  const b=await req.json();const rows=await sql`UPDATE member_queries SET read_at=COALESCE(read_at,now()) WHERE id=${Number(b.id)||0} AND admin_id=${u.id} RETURNING id`;return rows.length?reply({ok:true}):reply({error:'Query not found'},404);
 }
 return reply({error:'Method not allowed'},405);
}
