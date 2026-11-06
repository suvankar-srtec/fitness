export async function ensureGymBrandingSchema(sql){
 await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gym_address TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS gym_phone TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS gym_website TEXT NOT NULL DEFAULT ''`;
}
