export async function ensureMemberLoginSchema(sql){await sql.transaction([
 sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS password TEXT,ADD COLUMN IF NOT EXISTS password_ready BOOLEAN NOT NULL DEFAULT FALSE`,
 sql`CREATE TABLE IF NOT EXISTS member_sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES members(id),expires_at TIMESTAMPTZ NOT NULL)`,
 sql`ALTER TABLE member_sessions ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`,
 sql`CREATE TABLE IF NOT EXISTS member_otp_challenges(user_id INTEGER PRIMARY KEY REFERENCES members(id),phone TEXT NOT NULL,challenge_hash TEXT NOT NULL UNIQUE,otp_hash TEXT NOT NULL,reset_token_hash TEXT UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,verified_at TIMESTAMPTZ,used_at TIMESTAMPTZ)`,
 sql`CREATE OR REPLACE FUNCTION gym_member_account_enabled(account_id INTEGER) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM members m JOIN users g ON g.id=m.admin_id WHERE m.id=account_id AND m.archived_at IS NULL AND g.archived_at IS NULL) $$`,
 sql`CREATE OR REPLACE FUNCTION gym_member_enabled(account_id INTEGER) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM members m JOIN users g ON g.id=m.admin_id WHERE m.id=account_id AND m.archived_at IS NULL AND g.archived_at IS NULL AND m.status='Active' AND m.valid_from<=(NOW() AT TIME ZONE 'Asia/Kolkata')::date AND m.valid_to>=(NOW() AT TIME ZONE 'Asia/Kolkata')::date) $$`,
 sql`CREATE OR REPLACE FUNCTION revoke_changed_member() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.phone IS DISTINCT FROM OLD.phone THEN NEW.password_ready:=FALSE;END IF;IF NEW.phone IS DISTINCT FROM OLD.phone OR NEW.archived_at IS NOT NULL OR NEW.status<>'Active' THEN DELETE FROM member_sessions WHERE user_id=NEW.id;DELETE FROM member_otp_challenges WHERE user_id=NEW.id;END IF;RETURN NEW;END;$$`,
 sql`DROP TRIGGER IF EXISTS revoke_changed_member ON members`,sql`CREATE TRIGGER revoke_changed_member BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION revoke_changed_member()`
]);}

