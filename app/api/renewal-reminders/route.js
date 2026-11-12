import {database} from '../../../lib/db';
import {runRenewalReminders} from '../../../lib/renewal-reminders.mjs';
export const runtime='nodejs';
export const maxDuration=300;
export async function GET(request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await runRenewalReminders(database()));}catch{return Response.json({error:'Reminder job failed'},{status:500});}
}
