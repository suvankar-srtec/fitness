import {NextResponse} from 'next/server.js';
export async function auditApi(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='GET')return reply({error:'Audit report is read-only'},405);
 if(!['admin','manager','superadmin'].includes(user.role))return reply({error:'Admin access required'},403);
 if(user.role==='manager'&&(!Number.isInteger(user.created_by)||user.created_by<1||!Number.isInteger(user.location_id)||user.location_id<1))return reply({error:'Assigned location required'},403);
 const params=new URL(request.url).searchParams,query=(params.get('q')||'').trim().slice(0,200),entity=params.get('entity')||'',cursor=params.get('cursor')||'9223372036854775807';
 if(!/^\d{1,19}$/.test(cursor)||BigInt(cursor)>9223372036854775807n)return reply({error:'Invalid page'},400);
 const match='%'+query.replace(/[\\%_]/g,'\\$&')+'%';
 const rows=await sql`SELECT a.id::text,a.occurred_at,a.entity,a.record_id,a.record_name,a.operation,a.before_data,a.after_data,a.gym_name,a.actor_user_id,a.actor_name
 FROM audit_records a
 LEFT JOIN LATERAL (
  SELECT u.role,u.location_id FROM users u WHERE u.created_by=a.admin_id AND (
   a.source_table='users' AND ((u.public_id=a.record_id OR EXISTS(SELECT 1 FROM account_public_id_aliases alias WHERE alias.source_table='users' AND alias.record_id=u.id AND alias.old_public_id=a.record_id)) OR u.id::text=a.record_id)
   OR a.source_table='sessions' AND (u.public_id=a.record_id OR EXISTS(SELECT 1 FROM account_public_id_aliases alias WHERE alias.source_table='users' AND alias.record_id=u.id AND alias.old_public_id=a.record_id))
   OR a.source_table='credential_messages' AND (u.public_id=COALESCE(a.after_data->>'recipient_user_id',a.record_id)
    OR EXISTS(SELECT 1 FROM account_public_id_aliases alias WHERE alias.source_table='users' AND alias.record_id=u.id AND alias.old_public_id=COALESCE(a.after_data->>'recipient_user_id',a.record_id))))
  UNION ALL
  SELECT 'member',m.location_id FROM members m WHERE m.admin_id=a.admin_id AND (
   a.source_table='members' AND ((m.public_id=a.record_id OR EXISTS(SELECT 1 FROM account_public_id_aliases alias WHERE alias.source_table='members' AND alias.record_id=m.id AND alias.old_public_id=a.record_id)) OR m.id::text=a.record_id)
   OR a.source_table IN ('attendance','member_pictures','whatsapp_gate_pass_messages','membership_assignments') AND m.id::text=COALESCE(a.after_data->>'member_id',a.before_data->>'member_id')
   OR a.source_table='member_sessions' AND m.id::text=COALESCE(a.after_data->>'user_id',a.before_data->>'user_id')
   OR a.source_table='membership_payments' AND EXISTS(SELECT 1 FROM membership_assignments assignment WHERE assignment.member_id=m.id AND assignment.id::text=COALESCE(a.after_data->>'assignment_id',a.before_data->>'assignment_id')))
 ) subject ON ${user.role==='manager'}
 LEFT JOIN users performer ON (performer.public_id=a.actor_user_id OR EXISTS(SELECT 1 FROM account_public_id_aliases alias WHERE alias.source_table='users' AND alias.record_id=performer.id AND alias.old_public_id=a.actor_user_id)) AND performer.created_by=a.admin_id
 WHERE (${user.role}='superadmin' OR a.admin_id=${user.role==='manager'?user.created_by:user.id})
 AND (${user.role!=='manager'} OR (a.actor_user_id=${user.public_id||''} OR EXISTS(SELECT 1 FROM account_public_id_aliases alias WHERE alias.source_table='users' AND alias.record_id=${user.id} AND alias.old_public_id=a.actor_user_id)) OR (
  COALESCE(a.after_data->>'actor_role',a.before_data->>'actor_role',performer.role) IN ('manager','supervisor','member')
  AND COALESCE(a.after_data->>'actor_location_id',a.before_data->>'actor_location_id',performer.location_id::text)=${String(user.location_id||'')}
 ) OR (
  COALESCE(a.after_data->>'subject_role',a.before_data->>'subject_role',subject.role) IN ('manager','supervisor','member')
  AND (COALESCE(a.after_data->>'subject_location_id',a.before_data->>'subject_location_id',subject.location_id::text)=${String(user.location_id||'')}
   OR a.before_data->>'subject_location_id'=${String(user.location_id||'')})))
 AND a.id<${cursor}::bigint AND (${entity}='' OR a.entity=${entity})
 AND (${query}='' OR a.record_name ILIKE ${match} OR a.record_id ILIKE ${match} OR a.actor_name ILIKE ${match} OR a.gym_name ILIKE ${match} OR a.entity ILIKE ${match})
 ORDER BY a.id DESC LIMIT 51`;

 const hasMore=rows.length>50,records=rows.slice(0,50);return reply({records,nextCursor:hasMore?records.at(-1).id:null});
}
