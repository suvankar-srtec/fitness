import {NextResponse} from 'next/server';
import {database} from '../../../lib/db';
import {sessionReadApi} from '../../../lib/session-read-api.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 const started=performance.now();let status=500;
 try{
  const result=await sessionReadApi(request,database(),{workspace:true});status=result.status;return result;
 }catch(error){status=503;console.error('workspace request failed',{name:error.name,code:error.code});return NextResponse.json({error:'Unable to connect to the server. Please retry.'},{status,headers:{'Cache-Control':'no-store'}});}
 finally{console.info('FITNESS_API_LATENCY '+JSON.stringify({action:'workspace',method:request.method,status,durationMs:Math.round(performance.now()-started)}));}
}
