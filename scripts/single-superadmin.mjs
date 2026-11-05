export async function ensureSingleSuperadmin(sql) {
 await sql.transaction([
  sql`LOCK TABLE users IN ACCESS EXCLUSIVE MODE`,
  sql`DO $$ BEGIN
   IF NOT EXISTS(SELECT 1 FROM users WHERE public_id='sp00' AND role='superadmin') THEN RAISE EXCEPTION 'Create sp00 before retiring other superadmins'; END IF;
   IF EXISTS(SELECT 1 FROM members WHERE admin_id IN (SELECT id FROM users WHERE role='superadmin' AND public_id<>'sp00'))
    OR EXISTS(SELECT 1 FROM plans WHERE admin_id IN (SELECT id FROM users WHERE role='superadmin' AND public_id<>'sp00'))
    OR EXISTS(SELECT 1 FROM member_registrations WHERE admin_id IN (SELECT id FROM users WHERE role='superadmin' AND public_id<>'sp00'))
    OR EXISTS(SELECT 1 FROM membership_assignments WHERE admin_id IN (SELECT id FROM users WHERE role='superadmin' AND public_id<>'sp00'))
    OR EXISTS(SELECT 1 FROM membership_payments WHERE admin_id IN (SELECT id FROM users WHERE role='superadmin' AND public_id<>'sp00'))
   THEN RAISE EXCEPTION 'Gym-owned records must be reassigned before retiring a superadmin'; END IF;
  END; $$`,
  sql`UPDATE users SET created_by=(SELECT id FROM users WHERE public_id='sp00') WHERE created_by IN (SELECT id FROM users WHERE role='superadmin' AND public_id<>'sp00')`,
  sql`UPDATE attendance SET marked_by=(SELECT id FROM users WHERE public_id='sp00') WHERE marked_by IN (SELECT id FROM users WHERE role='superadmin' AND public_id<>'sp00')`,
  sql`UPDATE whatsapp_gate_pass_messages SET requested_by=(SELECT id FROM users WHERE public_id='sp00') WHERE requested_by IN (SELECT id FROM users WHERE role='superadmin' AND public_id<>'sp00')`,
  sql`DELETE FROM users WHERE role='superadmin' AND public_id<>'sp00'`,
  sql`UPDATE users SET gym_name=NULL,created_by=NULL,gym_logo=NULL WHERE public_id='sp00' AND role='superadmin'`,
  sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_single_superadmin_check`,
  sql`ALTER TABLE users ADD CONSTRAINT users_single_superadmin_check CHECK(role<>'superadmin' OR (public_id='sp00' AND gym_name IS NULL AND created_by IS NULL))`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS one_superadmin ON users(role) WHERE role='superadmin'`
 ]);
}
