import {NextResponse} from 'next/server.js';
export async function memberGroupsApi(req,u,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!['admin','manager','superadmin'].includes(u.role))return reply({error:'Access denied'},403);
 const gym=u.role==='superadmin'?Number(new URL(req.url).searchParams.get('adminId')):u.role==='manager'?u.created_by:u.id;
 if(!Number.isInteger(gym)||gym<1)return reply({error:'Select a gym'},400);
 if(req.method==='GET')return reply([{name:'Default'},...await sql`SELECT id,name FROM gym_member_groups WHERE admin_id=${gym} AND lower(name)<>'default' ORDER BY lower(name)`]);
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const b=await req.json(),name=typeof b.name==='string'?b.name.trim():'';
 if(!name||name.length>60)return reply({error:'Enter a group name up to 60 characters'},400);
 if(name.toLowerCase()==='default')return reply({name:'Default'});
 const [row]=await sql`INSERT INTO gym_member_groups(admin_id,name) SELECT id,${name} FROM users WHERE id=${gym} AND role='admin' AND archived_at IS NULL ON CONFLICT(admin_id,lower(name)) DO UPDATE SET name=gym_member_groups.name RETURNING id,name`;
 return row?reply(row,201):reply({error:'Gym not found'},404);
}
