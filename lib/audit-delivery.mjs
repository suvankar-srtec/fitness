export async function auditCredentialDelivery(sql,actor,target,status,messageId=null){
 const adminId=target.role==='admin'?target.id:target.created_by;
 await sql`INSERT INTO audit_records(admin_id,gym_name,actor_id,actor_user_id,actor_name,source_table,entity,record_id,record_name,operation,after_data) SELECT ${adminId},COALESCE((SELECT COALESCE(NULLIF(gym_name,''),name) FROM users WHERE id=${adminId}),''),${actor.id},${actor.public_id},${actor.name},'credential_messages','WhatsApp',${target.public_id},${target.name},${status},jsonb_build_object('kind','Account setup invitation','recipient_user_id',${target.public_id}::text,'phone',${target.phone}::text,'status',${status}::text,'message_id',${messageId}::text)`;
}
