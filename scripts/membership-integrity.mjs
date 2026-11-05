export async function ensureMembershipIntegrity(sql) {
 await sql.transaction([
  sql`LOCK TABLE membership_assignments,membership_payments IN ACCESS EXCLUSIVE MODE`,
  sql`ALTER TABLE membership_assignments ADD COLUMN IF NOT EXISTS superseded_by INTEGER REFERENCES membership_assignments(id)`,
  // Retain duplicate rows for audit. Supersede only exact, unpaid duplicates
  // which have no payment history; never move or remove recorded payments.
  sql`WITH ranked AS (SELECT id,FIRST_VALUE(id) OVER (PARTITION BY member_id,plan_id,valid_from,valid_to ORDER BY paid DESC,id) AS keep_id FROM membership_assignments WHERE superseded_by IS NULL) UPDATE membership_assignments a SET superseded_by=r.keep_id FROM ranked r,membership_assignments keeper WHERE a.id=r.id AND a.id<>r.keep_id AND keeper.id=r.keep_id AND a.amount=keeper.amount AND a.paid=0 AND NOT EXISTS(SELECT 1 FROM membership_payments p WHERE p.assignment_id=a.id)`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS memberships_unique_term ON membership_assignments(member_id,plan_id,valid_from,valid_to) WHERE superseded_by IS NULL`
 ]);
}
