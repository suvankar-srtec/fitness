export async function migratePublicIds(sql) {
 await sql.transaction([
  sql`LOCK TABLE users,members,member_registrations IN ACCESS EXCLUSIVE MODE`,
  sql`CREATE SEQUENCE IF NOT EXISTS gym_superadmin_ids`,
  sql`CREATE SEQUENCE IF NOT EXISTS gym_admin_ids`,
  sql`CREATE SEQUENCE IF NOT EXISTS gym_supervisor_ids`,
  sql`CREATE SEQUENCE IF NOT EXISTS gym_manager_ids`,
  sql`CREATE SEQUENCE IF NOT EXISTS gym_member_ids`,
  sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id TEXT`,
  sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS public_id TEXT`,
  sql`ALTER TABLE member_registrations ADD COLUMN IF NOT EXISTS public_id TEXT`,
  sql`CREATE OR REPLACE FUNCTION gym_next_public_id(prefix TEXT, sequence_name REGCLASS) RETURNS TEXT LANGUAGE plpgsql AS $$ DECLARE number BIGINT; BEGIN number:=nextval(sequence_name); RETURN prefix||CASE WHEN number<10 THEN '0' ELSE '' END||number::text; END; $$`,
  sql`DO $$ DECLARE account RECORD; BEGIN FOR account IN SELECT id,role FROM users WHERE public_id IS NULL ORDER BY id LOOP UPDATE users SET public_id=CASE account.role WHEN 'superadmin' THEN gym_next_public_id('sp','gym_superadmin_ids') WHEN 'admin' THEN gym_next_public_id('ad','gym_admin_ids') WHEN 'manager' THEN gym_next_public_id('mgr','gym_manager_ids') ELSE gym_next_public_id('sup','gym_supervisor_ids') END WHERE id=account.id; END LOOP; END; $$`,
  sql`DO $$ DECLARE member RECORD; BEGIN FOR member IN SELECT id FROM members WHERE public_id IS NULL ORDER BY id LOOP UPDATE members SET public_id=gym_next_public_id('mem','gym_member_ids') WHERE id=member.id; END LOOP; END; $$`,
  sql`DO $$ DECLARE reservation RECORD; BEGIN FOR reservation IN SELECT token_hash FROM member_registrations WHERE public_id IS NULL ORDER BY member_id LOOP UPDATE member_registrations SET public_id=gym_next_public_id('mem','gym_member_ids') WHERE token_hash=reservation.token_hash; END LOOP; END; $$`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS users_public_id ON users(public_id)`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS members_public_id ON members(public_id)`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS reservations_public_id ON member_registrations(public_id)`,
  sql`CREATE OR REPLACE FUNCTION gym_user_id_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.public_id IS NULL THEN NEW.public_id:=CASE NEW.role WHEN 'superadmin' THEN gym_next_public_id('sp','gym_superadmin_ids') WHEN 'admin' THEN gym_next_public_id('ad','gym_admin_ids') WHEN 'manager' THEN gym_next_public_id('mgr','gym_manager_ids') ELSE gym_next_public_id('sup','gym_supervisor_ids') END; END IF; RETURN NEW; END; $$`,
  sql`CREATE OR REPLACE FUNCTION gym_member_id_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.public_id IS NULL THEN NEW.public_id:=gym_next_public_id('mem','gym_member_ids'); END IF; RETURN NEW; END; $$`,
  sql`DROP TRIGGER IF EXISTS gym_assign_user_id ON users`,
  sql`CREATE TRIGGER gym_assign_user_id BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION gym_user_id_trigger()`,
  sql`DROP TRIGGER IF EXISTS gym_assign_member_id ON members`,
  sql`CREATE TRIGGER gym_assign_member_id BEFORE INSERT ON members FOR EACH ROW EXECUTE FUNCTION gym_member_id_trigger()`,
  sql`ALTER TABLE users ALTER COLUMN public_id SET NOT NULL`,
  sql`ALTER TABLE members ALTER COLUMN public_id SET NOT NULL`
 ]);
}
