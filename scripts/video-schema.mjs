export async function ensureVideoSchema(sql){await sql.transaction([
 sql`CREATE TABLE IF NOT EXISTS gym_videos(id UUID PRIMARY KEY,admin_id INTEGER NOT NULL REFERENCES users(id),location_id INTEGER REFERENCES gym_locations(id),uploaded_by INTEGER NOT NULL REFERENCES users(id),name TEXT NOT NULL,pathname TEXT NOT NULL UNIQUE,content_type TEXT NOT NULL,size BIGINT NOT NULL CHECK(size>0 AND size<=209715200),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready')),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),archived_at TIMESTAMPTZ)`,
 sql`CREATE INDEX IF NOT EXISTS gym_videos_directory ON gym_videos(admin_id,location_id,created_at DESC) WHERE archived_at IS NULL`
]);}
