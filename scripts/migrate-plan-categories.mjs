import nextEnv from '@next/env';
import {neon} from '@neondatabase/serverless';
import {ensurePlanCategorySchema} from './plan-category-schema.mjs';
nextEnv.loadEnvConfig(process.cwd());
if(!process.env.DATABASE_URL)throw Error('DATABASE_NOT_CONFIGURED');
try{await ensurePlanCategorySchema(neon(process.env.DATABASE_URL));console.log('Plan categories ready. Existing plans are retained under Gym.');}catch(error){console.error('Plan category migration failed',{code:error.code||error.name});process.exitCode=1;}
