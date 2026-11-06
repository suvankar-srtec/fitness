export async function ensureArchiveSchema(sql){
 await sql.transaction([
  sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`,
  sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`,
  sql`CREATE OR REPLACE FUNCTION gym_account_enabled(account_id INTEGER) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM users u WHERE u.id=account_id AND u.archived_at IS NULL AND (u.role NOT IN ('manager','supervisor') OR EXISTS(SELECT 1 FROM users g WHERE g.id=u.created_by AND g.role='admin' AND g.archived_at IS NULL))) $$`,
  sql`CREATE OR REPLACE FUNCTION revoke_archived_account() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN DELETE FROM sessions WHERE user_id=NEW.id OR (NEW.role='admin' AND user_id IN(SELECT id FROM users WHERE created_by=NEW.id AND role IN ('manager','supervisor')));DELETE FROM phone_otp_challenges WHERE user_id=NEW.id OR (NEW.role='admin' AND user_id IN(SELECT id FROM users WHERE created_by=NEW.id AND role IN ('manager','supervisor')));END IF;RETURN NEW;END;$$`,
  sql`DROP TRIGGER IF EXISTS revoke_archived_account ON users`,
  sql`CREATE TRIGGER revoke_archived_account AFTER UPDATE OF archived_at ON users FOR EACH ROW EXECUTE FUNCTION revoke_archived_account()`
 ]);
}
