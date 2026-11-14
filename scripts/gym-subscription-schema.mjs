export async function ensureGymSubscriptionSchema(sql){
 await sql.transaction([
 sql`CREATE TABLE IF NOT EXISTS gym_subscriptions(admin_id INTEGER PRIMARY KEY REFERENCES users(id),valid_from DATE,valid_until DATE,member_limit INTEGER CHECK(member_limit>=0),manager_limit INTEGER CHECK(manager_limit>=0),supervisor_limit INTEGER CHECK(supervisor_limit>=0),branch_limit INTEGER CHECK(branch_limit>=0),CHECK(valid_until IS NULL OR valid_from IS NULL OR valid_until>=valid_from))`,
 sql`CREATE OR REPLACE FUNCTION gym_subscription_active(gym INTEGER) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT NOT EXISTS(SELECT 1 FROM gym_subscriptions WHERE admin_id=gym AND (valid_from>(NOW() AT TIME ZONE 'Asia/Kolkata')::date OR valid_until<(NOW() AT TIME ZONE 'Asia/Kolkata')::date)) $$`,
 sql`CREATE OR REPLACE FUNCTION gym_active_member_count(gym INTEGER,day DATE) RETURNS INTEGER LANGUAGE sql STABLE AS $$
 SELECT count(*)::int FROM members WHERE admin_id=gym AND archived_at IS NULL AND status='Active' AND valid_from<=day AND valid_to>=day
 $$`,
 // Check overlapping validity, including scheduled starts, so time passing cannot overbook a gym.
 sql`CREATE OR REPLACE FUNCTION gym_member_peak_usage(gym INTEGER,starts DATE,ends DATE,excluded INTEGER) RETURNS INTEGER LANGUAGE sql STABLE AS $$
 WITH windows AS (
 SELECT GREATEST(valid_from,starts) AS first_day,LEAST(valid_to,ends) AS last_day FROM members
 WHERE admin_id=gym AND archived_at IS NULL AND status='Active' AND id<>excluded AND valid_from<=ends AND valid_to>=starts
 ), events AS (
 SELECT first_day AS day,1 AS delta FROM windows UNION ALL SELECT last_day+1 AS day,-1 AS delta FROM windows
 ), daily AS (SELECT day,sum(delta) AS delta FROM events GROUP BY day), usage AS (
 SELECT sum(delta) OVER(ORDER BY day) AS used FROM daily
 ) SELECT COALESCE(max(used),0)::int FROM usage
 $$`,
 sql`CREATE OR REPLACE FUNCTION enforce_gym_capacity() RETURNS TRIGGER LANGUAGE plpgsql VOLATILE AS $$
 DECLARE gym INTEGER; cap INTEGER; used INTEGER; category TEXT; cfg gym_subscriptions%ROWTYPE; today DATE:=(NOW() AT TIME ZONE 'Asia/Kolkata')::date;
 BEGIN
 IF TG_TABLE_NAME='members' THEN
  IF NEW.archived_at IS NOT NULL OR NEW.status IS DISTINCT FROM 'Active' OR NEW.valid_from IS NULL OR NEW.valid_to IS NULL OR NEW.valid_to<today THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN IF OLD.archived_at IS NULL AND OLD.admin_id=NEW.admin_id AND OLD.status='Active' AND NEW.valid_from>=OLD.valid_from AND NEW.valid_to<=OLD.valid_to THEN RETURN NEW; END IF; END IF;
  gym:=NEW.admin_id; category:='MEMBER';
 ELSIF TG_TABLE_NAME='users' THEN
  IF NEW.role NOT IN ('manager','supervisor') OR NEW.archived_at IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN IF OLD.archived_at IS NULL AND OLD.created_by IS NOT DISTINCT FROM NEW.created_by AND OLD.role=NEW.role THEN RETURN NEW; END IF; END IF;
  gym:=NEW.created_by; category:=upper(NEW.role);
 ELSE
  gym:=NEW.admin_id;category:='BRANCH';
  IF TG_OP='UPDATE' THEN IF OLD.admin_id=NEW.admin_id THEN RETURN NEW;END IF;END IF;
  IF EXISTS(SELECT 1 FROM gym_locations WHERE admin_id=gym AND lower(name)=lower(NEW.name)) THEN RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(74123,gym);
 IF NOT gym_subscription_active(gym) THEN RAISE EXCEPTION 'GYM_SUBSCRIPTION_INACTIVE'; END IF;
 SELECT * INTO cfg FROM gym_subscriptions WHERE admin_id=gym;
 IF category='MEMBER' THEN cap:=cfg.member_limit;used:=gym_member_peak_usage(gym,GREATEST(NEW.valid_from,today),NEW.valid_to,NEW.id);
 ELSIF category='MANAGER' THEN cap:=cfg.manager_limit;SELECT count(*) INTO used FROM users WHERE created_by=gym AND role='manager' AND archived_at IS NULL AND id<>NEW.id;
 ELSIF category='SUPERVISOR' THEN cap:=cfg.supervisor_limit;SELECT count(*) INTO used FROM users WHERE created_by=gym AND role='supervisor' AND archived_at IS NULL AND id<>NEW.id;
 ELSE cap:=cfg.branch_limit;SELECT count(*) INTO used FROM gym_locations WHERE admin_id=gym AND id<>NEW.id;
 END IF;
 IF cap IS NOT NULL AND used>=cap THEN RAISE EXCEPTION 'GYM_%_LIMIT',category;END IF;
 RETURN NEW; END; $$`,
 sql`CREATE OR REPLACE FUNCTION validate_gym_subscription() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(74123,NEW.admin_id);
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.admin_id AND role='admin') THEN RAISE EXCEPTION 'INVALID_GYM';END IF;
 IF (NEW.member_limit IS NOT NULL AND NEW.member_limit<gym_member_peak_usage(NEW.admin_id,(NOW() AT TIME ZONE 'Asia/Kolkata')::date,'9999-12-31'::date,-1)) OR (NEW.manager_limit IS NOT NULL AND NEW.manager_limit<(SELECT count(*) FROM users WHERE created_by=NEW.admin_id AND role='manager' AND archived_at IS NULL)) OR (NEW.supervisor_limit IS NOT NULL AND NEW.supervisor_limit<(SELECT count(*) FROM users WHERE created_by=NEW.admin_id AND role='supervisor' AND archived_at IS NULL)) OR (NEW.branch_limit IS NOT NULL AND NEW.branch_limit<(SELECT count(*) FROM gym_locations WHERE admin_id=NEW.admin_id)) THEN RAISE EXCEPTION 'GYM_LIMIT_BELOW_USAGE';END IF;RETURN NEW;END; $$`,
 sql`DROP TRIGGER IF EXISTS validate_gym_subscription ON gym_subscriptions`,
 sql`CREATE TRIGGER validate_gym_subscription BEFORE INSERT OR UPDATE ON gym_subscriptions FOR EACH ROW EXECUTE FUNCTION validate_gym_subscription()`,
 sql`DROP TRIGGER IF EXISTS gym_capacity ON members`,sql`CREATE TRIGGER gym_capacity BEFORE INSERT OR UPDATE ON members FOR EACH ROW EXECUTE FUNCTION enforce_gym_capacity()`,
 sql`DROP TRIGGER IF EXISTS gym_capacity ON users`,sql`CREATE TRIGGER gym_capacity BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION enforce_gym_capacity()`,
 sql`DROP TRIGGER IF EXISTS gym_capacity ON gym_locations`,sql`CREATE TRIGGER gym_capacity BEFORE INSERT OR UPDATE ON gym_locations FOR EACH ROW EXECUTE FUNCTION enforce_gym_capacity()`
 ]);
}
