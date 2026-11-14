// Run during setup, never on a page request. Existing records are unchanged.
export async function ensurePerformanceIndexes(sql){
 await sql`CREATE INDEX IF NOT EXISTS membership_payments_assignment_history ON membership_payments(assignment_id,id DESC)`;
 await sql`CREATE INDEX IF NOT EXISTS membership_payments_gym_date ON membership_payments(admin_id,paid_on DESC,id DESC)`;
 await sql`CREATE INDEX IF NOT EXISTS membership_assignments_member_history ON membership_assignments(member_id,id DESC)`;
 await sql`CREATE INDEX IF NOT EXISTS membership_assignments_current_member ON membership_assignments(member_id,id DESC) WHERE superseded_by IS NULL`;
 await sql`CREATE INDEX IF NOT EXISTS members_active_capacity ON members(admin_id,valid_from,valid_to) WHERE archived_at IS NULL AND status='Active'`;
 await sql`CREATE INDEX IF NOT EXISTS members_branch_directory ON members(admin_id,location_id,id DESC) WHERE archived_at IS NULL`;
 await sql`CREATE INDEX IF NOT EXISTS gym_supplements_directory ON gym_supplements(admin_id,id DESC)`;
}
