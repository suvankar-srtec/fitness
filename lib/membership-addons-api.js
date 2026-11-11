import {NextResponse} from 'next/server.js';
import {DEFAULT_MEMBERSHIP_ADDONS,addonPrice} from './membership-addons.mjs';
export async function membershipAddonsApi(req,u,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!['admin','manager'].includes(u.role))return reply({error:'Access denied'},403);
 const gym=u.role==='manager'?u.created_by:u.id;
 if(!gym||(u.role==='manager'&&!u.location_id))return reply({error:'Assigned gym and location required'},403);
 if(req.method==='GET'){
  const rows=await sql`SELECT name,amount FROM gym_membership_addons WHERE admin_id=${gym} ORDER BY name`;
  const names=new Set(rows.map(row=>row.name.toLowerCase()));
  return reply([...DEFAULT_MEMBERSHIP_ADDONS.filter(name=>!names.has(name.toLowerCase())).map(name=>({name,amount:null})),...rows]);
 }
 if(!['POST','PATCH'].includes(req.method))return reply({error:'Method not allowed'},405);
 const b=await req.json(),name=typeof b.name==='string'?b.name.trim():'';
 const amount=b.amount===undefined?null:addonPrice(b.amount);
 if(!name||name.length>80||(b.amount!==undefined&&amount===null))return reply({error:'Enter an add-on name and a valid amount'},400);
 if(req.method==='PATCH'&&amount===null)return reply({error:'Enter an amount'},400);
 const rows=req.method==='PATCH'?await sql`INSERT INTO gym_membership_addons(admin_id,name,amount) VALUES(${gym},${name},${amount}) ON CONFLICT (admin_id,lower(name)) DO UPDATE SET amount=EXCLUDED.amount RETURNING name,amount`:await sql`INSERT INTO gym_membership_addons(admin_id,name,amount) VALUES(${gym},${name},${amount}) ON CONFLICT (admin_id,lower(name)) DO UPDATE SET name=gym_membership_addons.name RETURNING name,amount`;
 return reply(rows[0],req.method==='POST'?201:200);
}
