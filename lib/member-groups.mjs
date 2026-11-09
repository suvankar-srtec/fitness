export async function ensureMemberGroupSchema(sql){
 await sql`CREATE TABLE IF NOT EXISTS gym_member_groups(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,admin_id INTEGER NOT NULL REFERENCES users(id),name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
 await sql`CREATE UNIQUE INDEX IF NOT EXISTS gym_member_groups_name ON gym_member_groups(admin_id,lower(name))`;
 await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS group_name TEXT NOT NULL DEFAULT 'Default'`;
}
