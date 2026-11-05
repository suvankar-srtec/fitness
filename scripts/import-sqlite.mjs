import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { DatabaseSync } from 'node:sqlite';
nextEnv.loadEnvConfig(process.cwd());
if(!process.env.DATABASE_URL){console.error('Configure DATABASE_URL in .env.local first.');process.exit(1);}
const sql=neon(process.env.DATABASE_URL);
try {
const [{count}]=await sql`SELECT (SELECT COUNT(*) FROM users WHERE role='admin')+(SELECT COUNT(*) FROM members) AS count`;
if(Number(count)!==0)throw Error('Target must have no administrators or members. Import into a fresh database only.');
const source=new DatabaseSync('data/gym.sqlite',{readOnly:true});
const users=source.prepare('SELECT * FROM users').all(),members=source.prepare('SELECT * FROM members').all();source.close();
await sql.transaction([
 sql`DELETE FROM sessions`,sql`DELETE FROM users WHERE role='superadmin'`,
 ...users.map(u=>sql`INSERT INTO users(id,name,password,role) VALUES(${u.id},${u.name},${u.password},${u.role})`),
 ...members.map(m=>sql`INSERT INTO members(id,admin_id,name,phone,email,plan,joined) VALUES(${m.id},${m.admin_id},${m.name},${m.phone},${m.email||''},${m.plan},${m.joined})`),
 sql`SELECT setval(pg_get_serial_sequence('users','id'),COALESCE((SELECT MAX(id) FROM users),1),EXISTS(SELECT 1 FROM users))`,
 sql`SELECT setval(pg_get_serial_sequence('members','id'),COALESCE((SELECT MAX(id) FROM members),1),EXISTS(SELECT 1 FROM members))`
]);
console.log(`Imported ${users.length} accounts and ${members.length} members. Existing passwords and IDs are preserved.`);
}catch(e){console.error('Import failed:',e.message.startsWith('Target must')?e.message:'Check the source SQLite file, Neon connection, and schema. No partial import is committed.');process.exitCode=1;}
