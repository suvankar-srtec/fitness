export const DEFAULT_MEMBERSHIP_ADDONS=['Personal Training','Fitness Assessment','Nutrition Consultation','Locker Rental','Towel Service'];
export function addonPrice(value){
 const raw=String(value??'').trim();
 if(!/^\d{1,7}(\.\d{1,2})?$/.test(raw)||Number(raw)<=0)return null;
 return Number(raw).toFixed(2);
}
export async function ensureMembershipAddonsSchema(sql){
 await sql`CREATE TABLE IF NOT EXISTS gym_membership_addons(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,admin_id INTEGER NOT NULL REFERENCES users(id),name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),amount NUMERIC(12,2) CHECK(amount>0),UNIQUE(admin_id,name))`;
 await sql`CREATE UNIQUE INDEX IF NOT EXISTS gym_membership_addons_name ON gym_membership_addons(admin_id,lower(name))`;
 await sql`ALTER TABLE membership_assignments ADD COLUMN IF NOT EXISTS addon_name TEXT NOT NULL DEFAULT '',ADD COLUMN IF NOT EXISTS addon_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(addon_amount>=0)`;
}
