export async function ensureMemberWelcomeSchema(sql){
 await sql`CREATE TABLE IF NOT EXISTS member_welcome_emails(member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,recipient TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('sending','accepted','failed','unknown')),message_id TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),sent_at TIMESTAMPTZ)`;
 await sql`CREATE INDEX IF NOT EXISTS whatsapp_gate_pass_member_delivery ON whatsapp_gate_pass_messages(member_id,status)`;
}
