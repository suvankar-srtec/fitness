export async function ensureScanEventSchema(sql){
 await sql`CREATE TABLE IF NOT EXISTS gym_scan_events(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,admin_id INTEGER NOT NULL REFERENCES users(id),location_id INTEGER NOT NULL REFERENCES gym_locations(id),supervisor_id INTEGER NOT NULL REFERENCES users(id),member_id INTEGER REFERENCES members(id),result TEXT NOT NULL CHECK(result IN ('Accepted','Rejected')),reason TEXT NOT NULL,occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
 await sql`CREATE INDEX IF NOT EXISTS gym_scan_events_recent ON gym_scan_events(admin_id,occurred_at DESC,id DESC)`;
}
