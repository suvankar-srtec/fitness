// Audit snapshots contain business data only; secrets and image bytes are never retained.
export async function ensureAuditSchema(sql){
 await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS audit_records(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),admin_id INTEGER,gym_name TEXT NOT NULL DEFAULT '',actor_id INTEGER,actor_user_id TEXT,actor_name TEXT NOT NULL DEFAULT 'System',source_table TEXT NOT NULL,entity TEXT NOT NULL,record_id TEXT NOT NULL,record_name TEXT NOT NULL DEFAULT '',operation TEXT NOT NULL,before_data JSONB,after_data JSONB,event_key TEXT UNIQUE)`,
  sql`CREATE INDEX IF NOT EXISTS audit_records_gym_id ON audit_records(admin_id,id DESC)`,
  sql`CREATE OR REPLACE FUNCTION audit_safe_snapshot(value JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $fn$ SELECT value-ARRAY['password','gym_logo','data','token','token_hash','request_key','registrationToken','reference']::text[] $fn$`,
  sql`CREATE OR REPLACE FUNCTION record_business_audit(table_name TEXT,row_value JSONB,event_operation TEXT,old_value JSONB,new_value JSONB) RETURNS VOID LANGUAGE plpgsql AS $fn$
  DECLARE actor JSONB;owner_id INTEGER;owner_name TEXT;entity_name TEXT;subject_name TEXT;subject_id TEXT;safe_old JSONB;safe_new JSONB;member_value JSONB;
  BEGIN
   actor:=COALESCE(NULLIF(current_setting('app.audit_actor',true),'')::jsonb,'{}'::jsonb);
   owner_id:=NULLIF(row_value->>'admin_id','')::integer;
   entity_name:=CASE table_name WHEN 'gym_videos' THEN 'Videos' WHEN 'members' THEN 'Members' WHEN 'plans' THEN 'Plans' WHEN 'membership_assignments' THEN 'Memberships' WHEN 'membership_payments' THEN 'Payments' WHEN 'attendance' THEN 'Attendance' WHEN 'gym_locations' THEN 'Locations' WHEN 'member_pictures' THEN 'Member photos' WHEN 'whatsapp_gate_pass_messages' THEN 'WhatsApp' WHEN 'sessions' THEN 'Sessions' WHEN 'member_sessions' THEN 'Sessions' ELSE 'Staff' END;
   IF table_name='users' THEN
    owner_id:=CASE WHEN row_value->>'role'='admin' THEN (row_value->>'id')::integer WHEN row_value->>'role' IN ('manager','supervisor') THEN (row_value->>'created_by')::integer ELSE NULL END;
    entity_name:=CASE row_value->>'role' WHEN 'admin' THEN 'Admins' WHEN 'supervisor' THEN 'Supervisors' WHEN 'manager' THEN 'Managers' ELSE 'Superadmin' END;
   END IF;
   IF table_name IN ('attendance','member_pictures','whatsapp_gate_pass_messages','membership_assignments') THEN
    SELECT to_jsonb(m) INTO member_value FROM members m WHERE m.id=(row_value->>'member_id')::integer;
    owner_id:=COALESCE(owner_id,(member_value->>'admin_id')::integer);
   END IF;
   IF table_name='membership_payments' THEN
    SELECT to_jsonb(m) INTO member_value FROM members m JOIN membership_assignments a ON a.member_id=m.id WHERE a.id=(row_value->>'assignment_id')::integer;
   END IF;
   IF table_name='sessions' THEN
    SELECT to_jsonb(u) INTO member_value FROM users u WHERE u.id=(row_value->>'user_id')::integer;
    owner_id:=CASE WHEN member_value->>'role'='admin' THEN (member_value->>'id')::integer WHEN member_value->>'role' IN ('manager','supervisor') THEN (member_value->>'created_by')::integer ELSE NULL END;
   END IF;
   IF table_name='member_sessions' THEN
    SELECT to_jsonb(m) INTO member_value FROM members m WHERE m.id=(row_value->>'user_id')::integer;
    owner_id:=(member_value->>'admin_id')::integer;
    IF actor='{}'::jsonb THEN actor:=jsonb_build_object('id',member_value->>'id','userId',member_value->>'public_id','name',member_value->>'name');END IF;
   END IF;
   SELECT COALESCE(NULLIF(u.gym_name,''),u.name) INTO owner_name FROM users u WHERE u.id=owner_id;
   IF table_name='users' AND row_value->>'role'='admin' THEN owner_name:=COALESCE(NULLIF(row_value->>'gym_name',''),row_value->>'name');END IF;
   subject_name:=COALESCE(NULLIF(row_value->>'name',''),member_value->>'name',row_value->>'plan_name','');
   subject_id:=COALESCE(row_value->>'public_id',row_value->>'id',row_value->>'member_id',row_value->>'user_id','');
   IF table_name IN ('sessions','member_sessions') THEN subject_id:=COALESCE(member_value->>'public_id',row_value->>'user_id');END IF;
   safe_old:=audit_safe_snapshot(old_value);safe_new:=audit_safe_snapshot(new_value);
   IF table_name='users' THEN
    IF old_value IS NOT NULL THEN safe_old:=safe_old||jsonb_build_object('has_logo',COALESCE(old_value->>'gym_logo','')<>'');END IF;
    IF new_value IS NOT NULL THEN safe_new:=safe_new||jsonb_build_object('has_logo',COALESCE(new_value->>'gym_logo','')<>'');END IF;
    IF event_operation='UPDATE' AND old_value->>'password' IS DISTINCT FROM new_value->>'password' THEN safe_new:=safe_new||'{"password_changed":true}'::jsonb;END IF;
    IF event_operation='UPDATE' AND old_value->>'gym_logo' IS DISTINCT FROM new_value->>'gym_logo' THEN safe_new:=safe_new||'{"logo_changed":true}'::jsonb;END IF;
   END IF;
   IF table_name='member_pictures' AND event_operation='UPDATE' AND old_value->>'data' IS DISTINCT FROM new_value->>'data' THEN safe_new:=safe_new||'{"photo_changed":true}'::jsonb;END IF;
   IF member_value IS NOT NULL THEN
    IF safe_old IS NOT NULL THEN safe_old:=safe_old||jsonb_build_object('subject_name',member_value->>'name','subject_public_id',member_value->>'public_id');END IF;
    IF safe_new IS NOT NULL THEN safe_new:=safe_new||jsonb_build_object('subject_name',member_value->>'name','subject_public_id',member_value->>'public_id');END IF;
   END IF;
   IF table_name IN ('users','members') THEN member_value:=row_value;END IF;
   IF member_value IS NOT NULL THEN
    IF safe_old IS NOT NULL THEN safe_old:=safe_old||jsonb_build_object('subject_role',CASE WHEN table_name IN ('members','member_sessions','attendance','member_pictures','whatsapp_gate_pass_messages','membership_assignments','membership_payments') THEN 'member' ELSE member_value->>'role' END,'subject_location_id',COALESCE(old_value->>'location_id',member_value->>'location_id'));END IF;
    IF safe_new IS NOT NULL THEN safe_new:=safe_new||jsonb_build_object('subject_role',CASE WHEN table_name IN ('members','member_sessions','attendance','member_pictures','whatsapp_gate_pass_messages','membership_assignments','membership_payments') THEN 'member' ELSE member_value->>'role' END,'subject_location_id',member_value->>'location_id');END IF;
   END IF;
   IF event_operation='UPDATE' AND safe_old IS NOT DISTINCT FROM safe_new THEN RETURN;END IF;
   INSERT INTO audit_records(admin_id,gym_name,actor_id,actor_user_id,actor_name,source_table,entity,record_id,record_name,operation,before_data,after_data,event_key)
   VALUES(owner_id,COALESCE(owner_name,''),NULLIF(actor->>'id','')::integer,actor->>'userId',COALESCE(actor->>'name','System'),table_name,entity_name,subject_id,subject_name,event_operation,safe_old,safe_new,CASE WHEN event_operation='EXISTING' THEN table_name||':'||subject_id ELSE NULL END) ON CONFLICT(event_key) DO NOTHING;
  END $fn$`,
  sql`CREATE OR REPLACE FUNCTION capture_business_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
  BEGIN
   IF TG_OP='DELETE' THEN PERFORM record_business_audit(TG_TABLE_NAME,to_jsonb(OLD),TG_OP,to_jsonb(OLD),NULL);RETURN OLD;
   ELSIF TG_OP='INSERT' THEN PERFORM record_business_audit(TG_TABLE_NAME,to_jsonb(NEW),TG_OP,NULL,to_jsonb(NEW));RETURN NEW;
   ELSE PERFORM record_business_audit(TG_TABLE_NAME,to_jsonb(NEW),TG_OP,to_jsonb(OLD),to_jsonb(NEW));RETURN NEW;END IF;
  END $fn$`,
  sql`DO $fn$ DECLARE item TEXT;BEGIN FOREACH item IN ARRAY ARRAY['gym_videos','users','members','plans','gym_locations','membership_assignments','membership_payments','attendance','member_pictures','whatsapp_gate_pass_messages','sessions','member_sessions'] LOOP
   EXECUTE format('DROP TRIGGER IF EXISTS business_audit ON %I',item);
   EXECUTE format('CREATE TRIGGER business_audit BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION capture_business_audit()',item);
  END LOOP;END $fn$`,
  sql`DO $fn$ DECLARE item TEXT;BEGIN FOREACH item IN ARRAY ARRAY['gym_videos','users','members','plans','gym_locations','membership_assignments','membership_payments','attendance','member_pictures','whatsapp_gate_pass_messages'] LOOP
   EXECUTE format('SELECT record_business_audit(%L,to_jsonb(t),''EXISTING'',NULL,to_jsonb(t)) FROM %I t',item,item);
  END LOOP;END $fn$`,
  sql`CREATE OR REPLACE FUNCTION protect_audit_history() RETURNS TRIGGER LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'Audit history is append-only';END $fn$`,
  sql`DROP TRIGGER IF EXISTS protect_audit_history ON audit_records`,
  sql`CREATE TRIGGER protect_audit_history BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_records FOR EACH STATEMENT EXECUTE FUNCTION protect_audit_history()`
 ]);
}
