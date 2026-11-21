import {NextResponse} from 'next/server';
import {database} from '../../../lib/db';
import {startupApi} from '../../../lib/startup-api.js';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request){try{return await startupApi(request,database());}catch(error){console.error('startup request failed',{name:error.name,code:error.code});return NextResponse.json({error:'Unable to connect to the server. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
