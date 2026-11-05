export async function ensureSupervisorLocationSession(sql){await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS selected_location_id INTEGER`;}
