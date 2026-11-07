import {NextResponse} from 'next/server.js';
export async function auditApi(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='GET')return reply({error:'Audit report is read-only'},405);
 if(!['admin','manager','superadmin'].includes(user.role))return reply({error:'Admin access required'},403);
 const params=new URL(request.url).searchParams,query=(params.get('q')||'').trim().slice(0,200),entity=params.get('entity')||'',cursor=params.get('cursor')||'9223372036854775807';
 if(!/^\d{1,19}$/.test(cursor)||BigInt(cursor)>9223372036854775807n)return reply({error:'Invalid page'},400);
 const match='%'+query.replace(/[\\%_]/g,'\\$&')+'%';
 const rows=await sql`SELECT id::text,occurred_at,entity,record_id,record_name,operation,before_data,after_data,gym_name,actor_user_id,actor_name FROM audit_records WHERE (${user.role}='superadmin' OR admin_id=${user.role==='manager'?user.created_by:user.id}) AND (${user.role!=='manager'} OR actor_user_id=${user.public_id} OR before_data->>'location_id'=${String(user.location_id||'')} OR after_data->>'location_id'=${String(user.location_id||'')} OR EXISTS(SELECT 1 FROM members m WHERE m.admin_id=${user.created_by||null} AND m.location_id=${user.location_id||null} AND (m.public_id=record_id OR m.id::text=record_id OR m.id::text=before_data->>'member_id' OR m.id::text=after_data->>'member_id'))) AND id<${cursor}::bigint AND (${entity}='' OR entity=${entity}) AND (${query}='' OR record_name ILIKE ${match} OR record_id ILIKE ${match} OR actor_name ILIKE ${match} OR gym_name ILIKE ${match} OR entity ILIKE ${match}) ORDER BY id DESC LIMIT 51`;
 const hasMore=rows.length>50,records=rows.slice(0,50);return reply({records,nextCursor:hasMore?records.at(-1).id:null});
}
