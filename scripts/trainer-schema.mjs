export async function ensureTrainerSchema(sql){await sql.transaction([
 sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS access_enabled BOOLEAN NOT NULL DEFAULT TRUE`,
 sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS trainer_id INTEGER REFERENCES users(id)`,
 sql`CREATE INDEX IF NOT EXISTS members_trainer_directory ON members(trainer_id,location_id,id DESC) WHERE archived_at IS NULL`,
 sql`CREATE OR REPLACE FUNCTION gym_account_enabled(account_id INTEGER) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM users u WHERE u.id=account_id AND u.archived_at IS NULL AND u.access_enabled AND (u.role NOT IN ('manager','supervisor') OR EXISTS(SELECT 1 FROM users g WHERE g.id=u.created_by AND g.role='admin' AND g.archived_at IS NULL AND g.access_enabled))) $$`,
 sql`CREATE OR REPLACE FUNCTION validate_member_trainer() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.trainer_id IS NULL THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' THEN IF NEW.trainer_id IS NOT DISTINCT FROM OLD.trainer_id AND NEW.location_id IS NOT DISTINCT FROM OLD.location_id AND NEW.admin_id=OLD.admin_id THEN RETURN NEW;END IF;END IF;
 IF NOT EXISTS(SELECT 1 FROM users t JOIN employee_roles r ON r.id=t.employee_role_id AND r.admin_id=t.created_by WHERE t.id=NEW.trainer_id AND t.role='supervisor' AND lower(r.name)='trainer' AND t.created_by=NEW.admin_id AND t.location_id=NEW.location_id AND gym_account_enabled(t.id)) THEN RAISE EXCEPTION 'INVALID_MEMBER_TRAINER';END IF;RETURN NEW;END;$$`,
 sql`DROP TRIGGER IF EXISTS validate_member_trainer ON members`,
 sql`CREATE TRIGGER validate_member_trainer BEFORE INSERT OR UPDATE ON members FOR EACH ROW EXECUTE FUNCTION validate_member_trainer()`
]);}
