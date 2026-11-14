import {NextResponse} from 'next/server.js';
export async function employeeRolesApi(request,user,sql){
 const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(!['admin','manager','superadmin'].includes(user.role))return reply({error:'Access denied'},403);
 if(user.role==='manager'&&!user.location_id)return reply({error:'Assigned location required'},403);
 const requested=new URL(request.url).searchParams.get('adminId');
 const gym=user.role==='superadmin'?Number(requested):user.role==='manager'?user.created_by:user.id;
 if(!Number.isInteger(gym)||gym<1)return reply({error:'Select an organization'},400);
 if(request.method==='GET')return reply(await sql`SELECT id,name,base_role AS "baseRole" FROM employee_roles WHERE admin_id=${gym} ORDER BY lower(name),id`);
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(user.role==='superadmin')return reply({error:'Organization staff access required'},403);
 const body=await request.json(),name=typeof body.name==='string'?body.name.trim().replace(/\s+/g,' '):'';
 if(!name||name.length>60||/[\u0000-\u001f\u007f]/.test(name)||['manager','supervisor'].includes(name.toLowerCase())||!['manager','supervisor'].includes(body.baseRole))return reply({error:'Enter a unique role name and select its access'},400);
 const [role]=await sql`INSERT INTO employee_roles(admin_id,name,base_role) VALUES(${gym},${name},${body.baseRole}) ON CONFLICT(admin_id,lower(name)) DO NOTHING RETURNING id,name,base_role AS "baseRole"`;
 return role?reply(role,201):reply({error:'This role already exists'},409);
}
export async function resolveEmployeeRole(sql,gym,body){
 if(body.employeeRoleId===undefined||body.employeeRoleId===null||body.employeeRoleId==='')return {role:body.role,employeeRoleId:null,name:null};
 const id=Number(body.employeeRoleId);
 if(!Number.isInteger(id)||id<1)return null;
 const [role]=await sql`SELECT id,name,base_role FROM employee_roles WHERE id=${id} AND admin_id=${gym}`;
 return role?{role:role.base_role,employeeRoleId:role.id,name:role.name}:null;
}
