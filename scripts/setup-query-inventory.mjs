import nextEnv from '@next/env';
import {neon} from '@neondatabase/serverless';
import {ensureMemberQueriesSchema} from '../lib/member-queries-schema.mjs';
import {ensureCommerceSchema} from '../lib/commerce-schema.mjs';
import {ensureAuditSchema} from './audit-schema.mjs';
nextEnv.loadEnvConfig(process.cwd());
try{
 if(!process.env.DATABASE_URL)throw new Error('Missing database configuration');
 const sql=neon(process.env.DATABASE_URL);
 await ensureMemberQueriesSchema(sql);await ensureCommerceSchema(sql);await ensureAuditSchema(sql);
 console.log('Query and inventory schema ready. Existing products start at zero stock until counted.');
}catch{console.error('Query and inventory setup failed; check database connectivity.');process.exitCode=1;}
