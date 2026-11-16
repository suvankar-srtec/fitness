// Public business support details, available only through authenticated routes.
export async function supportContact(sql){
 const [contact]=await sql`SELECT phone,email FROM users WHERE role='superadmin' AND public_id='sp00' AND archived_at IS NULL`;
 return {phone:contact?.phone||'',email:contact?.email||''};
}
