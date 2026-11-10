export async function ensureRenewalOptionsSchema(sql){
 await sql`ALTER TABLE membership_assignments ADD COLUMN IF NOT EXISTS duration_months INTEGER CHECK(duration_months IN (3,6,12)), ADD COLUMN IF NOT EXISTS trainer_included BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN IF NOT EXISTS renewal_kind TEXT CHECK(renewal_kind IN ('Advance','Renew'))`;
}
