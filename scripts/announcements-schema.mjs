export async function ensureAnnouncementsSchema(sql){
 await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS announcements(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,admin_id INTEGER NOT NULL REFERENCES users(id),location_id INTEGER REFERENCES gym_locations(id),created_by INTEGER NOT NULL REFERENCES users(id),title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),message TEXT NOT NULL DEFAULT '' CHECK(length(message)<=5000),file_name TEXT NOT NULL DEFAULT '',file_type TEXT NOT NULL DEFAULT '',file_data TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),archived_at TIMESTAMPTZ)`,
  sql`CREATE INDEX IF NOT EXISTS announcements_audience ON announcements(admin_id,location_id,id DESC) WHERE archived_at IS NULL`
 ]);
}
