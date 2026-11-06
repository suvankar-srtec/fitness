import {database} from '../../../lib/db';
import {validMediaRequest} from '../../../lib/whatsapp-media.mjs';
import {renderGatePass} from '../../../lib/gate-pass-image.mjs';
export const runtime='nodejs';
export async function GET(request){
 const id=validMediaRequest(new URL(request.url).searchParams,process.env.WAPMONKEY_API_KEY);
 if(!id)return new Response('Link expired or invalid',{status:403});
 try{const sql=database();const [member]=await sql`SELECT m.id,m.public_id,m.name,m.plan,m.status,to_char(m.valid_from,'YYYY-MM-DD') AS valid_from,to_char(m.valid_to,'YYYY-MM-DD') AS valid_to,COALESCE(NULLIF(u.gym_name,''),u.name) AS gym_name,u.gym_logo,u.gym_address,COALESCE(NULLIF(u.gym_phone,''),u.phone) AS gym_phone,u.gym_website,p.data AS photo,g.token FROM members m JOIN users u ON u.id=m.admin_id JOIN member_gate_passes g ON g.member_id=m.id LEFT JOIN member_pictures p ON p.member_id=m.id WHERE m.id=${id}`;
 if(!member)return new Response('Not found',{status:404});
 return new Response(await renderGatePass(member,member.token),{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','Content-Disposition':`inline; filename="${member.public_id}-gate-pass.png"`}});
 }catch{return new Response('Image unavailable',{status:503});}
}
