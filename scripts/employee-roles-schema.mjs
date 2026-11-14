export async function ensureEmployeeRolesSchema(sql){
 await sql.transaction([
  sql`CREATE TABLE IF NOT EXISTS employee_roles(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,admin_id INTEGER NOT NULL REFERENCES users(id),name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 60),base_role TEXT NOT NULL CHECK(base_role IN ('manager','supervisor')))`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS employee_roles_unique_name ON employee_roles(admin_id,lower(name))`,
  sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_role_id INTEGER REFERENCES employee_roles(id)`
 ]);
}
