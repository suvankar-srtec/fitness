export async function ensurePlanCategorySchema(sql){
 await sql.transaction([
  sql`ALTER TABLE plans ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Gym'`,
  sql`ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_category_check`,
  sql`ALTER TABLE plans ADD CONSTRAINT plans_category_check CHECK(length(btrim(category)) BETWEEN 1 AND 60)`,
  sql`DROP INDEX IF EXISTS plans_admin_name`,
  sql`CREATE UNIQUE INDEX plans_admin_name ON plans(admin_id,lower(category),lower(name)) WHERE archived=FALSE`
 ]);
}
