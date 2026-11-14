export async function ensureEmployeeSchema(sql){
 await sql.transaction([
  sql`CREATE SEQUENCE IF NOT EXISTS gym_employee_ids`,
  sql`CREATE OR REPLACE FUNCTION gym_new_employee_id(gym INTEGER,location INTEGER) RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
  DECLARE gym_code TEXT; location_code TEXT; number TEXT;
  BEGIN
   SELECT left(regexp_replace(upper(COALESCE(NULLIF(gym_name,''),name)),'[^A-Z0-9]','','g'),24) INTO gym_code FROM users WHERE id=gym AND role='admin';
   SELECT left(regexp_replace(upper(name),'[^A-Z0-9]','','g'),24) INTO location_code FROM gym_locations WHERE id=location AND admin_id=gym;
   IF gym_code IS NULL OR location_code IS NULL THEN RAISE EXCEPTION 'INVALID_GYM_LOCATION';END IF;
   number:=nextval('gym_employee_ids')::text;
   RETURN 'EMP-'||COALESCE(NULLIF(gym_code,''),'GYM'||gym)||'-'||COALESCE(NULLIF(location_code,''),'LOC'||location)||'-'||CASE WHEN length(number)<5 THEN lpad(number,5,'0') ELSE number END;
  END; $$`,
  sql`CREATE OR REPLACE FUNCTION gym_user_id_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
   IF NEW.role IN ('manager','supervisor') AND (NEW.public_id IS NULL OR NEW.public_id ~ '^(mgr|sup)[0-9]+$') THEN NEW.public_id:=gym_new_employee_id(NEW.created_by,NEW.location_id);
   ELSIF NEW.public_id IS NULL THEN NEW.public_id:=CASE NEW.role WHEN 'superadmin' THEN gym_next_public_id('sp','gym_superadmin_ids') ELSE gym_next_public_id('ad','gym_admin_ids') END;
   END IF;RETURN NEW;
  END; $$`
 ]);
}
