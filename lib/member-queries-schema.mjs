export async function ensureMemberQueriesSchema(sql){
 await sql`CREATE TABLE IF NOT EXISTS member_queries(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,admin_id INTEGER NOT NULL REFERENCES users(id),member_id INTEGER NOT NULL REFERENCES members(id),message TEXT NOT NULL CHECK(length(message) BETWEEN 1 AND 2000),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),read_at TIMESTAMPTZ)`;
 await sql`CREATE INDEX IF NOT EXISTS member_queries_gym_unread ON member_queries(admin_id,created_at DESC) WHERE read_at IS NULL`;
}
