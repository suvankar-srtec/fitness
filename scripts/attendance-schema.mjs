export async function ensureAttendanceSchema(sql) {
 await sql.transaction([
  sql`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'`,
  // Supervisors have only ever recorded attendance by scanning gate passes.
  sql`UPDATE attendance a SET source='qr' FROM users u WHERE a.marked_by=u.id AND u.role='supervisor' AND a.status='Present' AND a.source='manual'`
 ]);
}
