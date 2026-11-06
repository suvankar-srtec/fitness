export async function ensureManagerSchema(sql){
 await sql.transaction([
  sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
  sql`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('superadmin','admin','manager','supervisor'))`,
  sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
  sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS manager_requires_location`,
  sql`ALTER TABLE users ADD CONSTRAINT manager_requires_location CHECK(role<>'manager' OR (created_by IS NOT NULL AND location_id IS NOT NULL))`,
  sql`CREATE SEQUENCE IF NOT EXISTS gym_manager_ids`,
  sql`CREATE TABLE IF NOT EXISTS manager_registrations(token_hash TEXT PRIMARY KEY,admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,public_id TEXT NOT NULL UNIQUE DEFAULT gym_next_public_id('mgr','gym_manager_ids'),expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '15 minutes')`,
  sql`CREATE INDEX IF NOT EXISTS manager_registrations_expiry ON manager_registrations(expires_at)`,
  sql`CREATE INDEX IF NOT EXISTS users_branch_roles ON users(created_by,location_id,role)`,
  sql`CREATE OR REPLACE FUNCTION gym_user_id_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.public_id IS NULL THEN NEW.public_id:=CASE NEW.role WHEN 'superadmin' THEN gym_next_public_id('sp','gym_superadmin_ids') WHEN 'admin' THEN gym_next_public_id('ad','gym_admin_ids') WHEN 'manager' THEN gym_next_public_id('mgr','gym_manager_ids') ELSE gym_next_public_id('sup','gym_supervisor_ids') END; END IF; RETURN NEW; END; $$`
 ]);
}
