import {pathToFileURL} from 'node:url';
import {ensureAccountIdSchema} from './account-id-schema.mjs';
export async function migrateExistingAccountIds(sql){
 await ensureAccountIdSchema(sql);
 const result=await sql.transaction([
  sql`LOCK TABLE users,members,account_id_counters IN SHARE ROW EXCLUSIVE MODE`,
  sql`DO $$ DECLARE account RECORD; prefix TEXT; replacement TEXT; BEGIN
   IF EXISTS(SELECT 1 FROM users u LEFT JOIN gym_locations l ON l.id=u.location_id AND l.admin_id=u.created_by WHERE u.role IN ('manager','supervisor') AND l.id IS NULL)
    OR EXISTS(SELECT 1 FROM members m LEFT JOIN gym_locations l ON l.id=m.location_id AND l.admin_id=m.admin_id WHERE l.id IS NULL)
   THEN RAISE EXCEPTION 'Assign all existing accounts to a location before migrating IDs';END IF;
   FOR account IN SELECT id,role,created_by,location_id,public_id FROM users WHERE role IN ('manager','supervisor') ORDER BY id LOOP
    prefix:=CASE WHEN account.role='manager' THEN 'MA' ELSE 'EM' END;
    IF account.public_id ~ ('^'||prefix||'-[A-Z0-9]{4}-[0-9]{2,}$') THEN CONTINUE;END IF;
    replacement:=gym_new_account_id(prefix,account.created_by,account.location_id);
    INSERT INTO account_public_id_aliases(source_table,record_id,old_public_id) VALUES('users',account.id,account.public_id) ON CONFLICT DO NOTHING;
    UPDATE users SET public_id=replacement WHERE id=account.id;
   END LOOP;
   FOR account IN SELECT id,admin_id,location_id,public_id FROM members ORDER BY id LOOP
    IF account.public_id ~ '^ME-[A-Z0-9]{4}-[0-9]{2,}$' THEN CONTINUE;END IF;
    replacement:=gym_new_account_id('ME',account.admin_id,account.location_id);
    INSERT INTO account_public_id_aliases(source_table,record_id,old_public_id) VALUES('members',account.id,account.public_id) ON CONFLICT DO NOTHING;
    UPDATE members SET public_id=replacement WHERE id=account.id;
   END LOOP;
  END; $$`,
  sql`SELECT source_table,old_public_id,CASE WHEN source_table='users' THEN (SELECT public_id FROM users WHERE id=record_id) ELSE (SELECT public_id FROM members WHERE id=record_id) END AS new_public_id FROM account_public_id_aliases ORDER BY source_table,record_id,old_public_id`
 ]);
 return result[2];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {default:nextEnv}=await import('@next/env');const {neon}=await import('@neondatabase/serverless');
 nextEnv.loadEnvConfig(process.cwd());
 const rows=await migrateExistingAccountIds(neon(process.env.DATABASE_URL));
 console.log(JSON.stringify(rows));
}
