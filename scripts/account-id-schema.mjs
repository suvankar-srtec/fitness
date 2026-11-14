export async function ensureAccountIdSchema(sql){
 await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS account_public_id_aliases(source_table TEXT NOT NULL CHECK(source_table IN ('users','members')),record_id INTEGER NOT NULL,old_public_id TEXT NOT NULL,changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(source_table,old_public_id))`,
  sql`CREATE TABLE IF NOT EXISTS account_id_counters(prefix TEXT NOT NULL,scope_code TEXT NOT NULL,last_number BIGINT NOT NULL,PRIMARY KEY(prefix,scope_code))`,
  sql`CREATE OR REPLACE FUNCTION gym_new_account_id(prefix TEXT,gym INTEGER,location INTEGER) RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
  DECLARE company_code TEXT; location_code TEXT; scope TEXT; number TEXT;
  BEGIN
   IF prefix NOT IN ('MA','EM','ME') THEN RAISE EXCEPTION 'INVALID_ACCOUNT_TYPE';END IF;
   SELECT regexp_replace(upper(COALESCE(NULLIF(gym_name,''),name)),'[^A-Z0-9]','','g') INTO company_code FROM users WHERE id=gym AND role='admin';
   SELECT regexp_replace(upper(name),'[^A-Z0-9]','','g') INTO location_code FROM gym_locations WHERE id=location AND admin_id=gym;
   IF company_code IS NULL OR location_code IS NULL THEN RAISE EXCEPTION 'INVALID_GYM_LOCATION';END IF;
   scope:=rpad(left(company_code,2),2,'X')||rpad(left(location_code,2),2,'X');
   INSERT INTO account_id_counters AS counter(prefix,scope_code,last_number) VALUES(prefix,scope,1) ON CONFLICT ON CONSTRAINT account_id_counters_pkey DO UPDATE SET last_number=counter.last_number+1 RETURNING last_number::text INTO number;
   RETURN prefix||'-'||scope||'-'||CASE WHEN length(number)<2 THEN lpad(number,2,'0') ELSE number END;
  END; $$`,
  sql`CREATE OR REPLACE FUNCTION gym_user_id_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
   IF NEW.role IN ('manager','supervisor') AND (NEW.public_id IS NULL OR NEW.public_id ~ '^(mgr|sup)[0-9]+$') THEN NEW.public_id:=gym_new_account_id(CASE WHEN NEW.role='manager' THEN 'MA' ELSE 'EM' END,NEW.created_by,NEW.location_id);
   ELSIF NEW.public_id IS NULL THEN NEW.public_id:=CASE NEW.role WHEN 'superadmin' THEN gym_next_public_id('sp','gym_superadmin_ids') ELSE gym_next_public_id('ad','gym_admin_ids') END;
   END IF;RETURN NEW;
  END; $$`,
  sql`CREATE OR REPLACE FUNCTION gym_member_id_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
   IF NEW.public_id IS NULL OR NEW.public_id ~ '^mem[0-9]+$' THEN NEW.public_id:=gym_new_account_id('ME',NEW.admin_id,NEW.location_id);END IF;RETURN NEW;
  END; $$`
 ]);
}
