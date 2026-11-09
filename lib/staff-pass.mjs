export function staffScanAllowed(scanner,target){return ['manager','supervisor'].includes(scanner.role)&&scanner.id!==target.id&&scanner.created_by===target.created_by&&scanner.location_id===target.location_id&&!!scanner.location_id&&((scanner.role==='manager'&&target.role==='supervisor')||(scanner.role==='supervisor'&&target.role==='manager'));}
export function staffTokenFromQr(qr){if(typeof qr!=='string'||qr.length>4096)return null;try{const data=JSON.parse(qr);return data.type==='gym-staff-pass'&&data.version===1&&/^[a-f0-9]{64}$/.test(data.token)?data.token:null;}catch{return null;}}
export async function ensureStaffPassSchema(sql){
 await sql`CREATE TABLE IF NOT EXISTS staff_gate_passes(user_id INTEGER PRIMARY KEY REFERENCES users(id),token TEXT NOT NULL UNIQUE)`;
 await sql`CREATE TABLE IF NOT EXISTS staff_attendance(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),admin_id INTEGER NOT NULL REFERENCES users(id),location_id INTEGER NOT NULL REFERENCES gym_locations(id),attended_on DATE NOT NULL,first_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),last_out_at TIMESTAMPTZ,marked_by INTEGER NOT NULL REFERENCES users(id),UNIQUE(user_id,attended_on))`;
 await sql`ALTER TABLE gym_scan_events ADD COLUMN IF NOT EXISTS subject_user_id INTEGER REFERENCES users(id)`;
}
