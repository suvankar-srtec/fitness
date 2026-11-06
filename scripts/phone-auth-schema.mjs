export async function ensurePhoneAuthSchema(sql){
 await sql.transaction([
  sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_phone TEXT, ADD COLUMN IF NOT EXISTS password_ready BOOLEAN NOT NULL DEFAULT FALSE`,
  sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS pending_phone TEXT`,
  sql`UPDATE users SET password_ready=TRUE WHERE role='superadmin' AND password_ready=FALSE`,
  sql`DO $$ BEGIN IF EXISTS(SELECT 1 FROM (SELECT regexp_replace(phone,'[^0-9]','','g') AS phone FROM users WHERE COALESCE(phone,'')<>'' UNION ALL SELECT regexp_replace(phone,'[^0-9]','','g') FROM members WHERE phone<>'') contacts GROUP BY phone HAVING count(*)>1) THEN RAISE EXCEPTION 'PHONE_CONFLICTS_MUST_BE_RESOLVED';END IF;END;$$`,
  sql`CREATE TABLE IF NOT EXISTS account_phone_registry(phone TEXT PRIMARY KEY,source_table TEXT NOT NULL CHECK(source_table IN ('users','members')),record_id INTEGER NOT NULL,UNIQUE(source_table,record_id))`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS users_unique_phone ON users(phone) WHERE phone IS NOT NULL AND phone<>''`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS members_unique_phone ON members(phone) WHERE phone<>''`,
  sql`CREATE TABLE IF NOT EXISTS phone_otp_challenges(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,phone TEXT NOT NULL,challenge_hash TEXT NOT NULL UNIQUE,otp_hash TEXT NOT NULL,reset_token_hash TEXT UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,verified_at TIMESTAMPTZ,used_at TIMESTAMPTZ)`,
  sql`CREATE OR REPLACE FUNCTION enforce_account_phone() RETURNS TRIGGER LANGUAGE plpgsql AS $$ DECLARE normalized TEXT; BEGIN
   IF TG_OP='DELETE' THEN DELETE FROM account_phone_registry WHERE source_table=TG_TABLE_NAME AND record_id=OLD.id;RETURN OLD;END IF;
   normalized:=CASE WHEN COALESCE(trim(NEW.phone),'')='' THEN '' ELSE '+'||regexp_replace(NEW.phone,'[^0-9]','','g') END;
   IF normalized<>'' AND normalized!~'^[+][1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'INVALID_ACCOUNT_PHONE';END IF;
   NEW.phone:=normalized;
   IF TG_OP='UPDATE' AND COALESCE(OLD.phone,'')=normalized THEN RETURN NEW;END IF;
   DELETE FROM account_phone_registry WHERE source_table=TG_TABLE_NAME AND record_id=NEW.id;
   IF normalized<>'' THEN
    BEGIN INSERT INTO account_phone_registry(phone,source_table,record_id) VALUES(normalized,TG_TABLE_NAME,NEW.id);EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'PHONE_IN_USE';END;
    NEW.pending_phone:=NULL;
   END IF;
   IF TG_TABLE_NAME='users' THEN IF TG_OP='UPDATE' AND NEW.role<>'superadmin' THEN NEW.password_ready:=FALSE;DELETE FROM sessions WHERE user_id=NEW.id;DELETE FROM phone_otp_challenges WHERE user_id=NEW.id;END IF;END IF;
   RETURN NEW;
  END;$$`,
  sql`INSERT INTO account_phone_registry(phone,source_table,record_id) SELECT phone,'users',id FROM users WHERE COALESCE(phone,'')<>'' ON CONFLICT(source_table,record_id) DO NOTHING`,
  sql`INSERT INTO account_phone_registry(phone,source_table,record_id) SELECT phone,'members',id FROM members WHERE phone<>'' ON CONFLICT(source_table,record_id) DO NOTHING`,
  sql`DROP TRIGGER IF EXISTS a_account_phone ON users`,sql`DROP TRIGGER IF EXISTS a_account_phone ON members`,
  sql`CREATE TRIGGER a_account_phone BEFORE INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION enforce_account_phone()`,
  sql`CREATE TRIGGER a_account_phone BEFORE INSERT OR UPDATE OR DELETE ON members FOR EACH ROW EXECUTE FUNCTION enforce_account_phone()`
 ]);
}
