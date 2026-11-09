import {NextResponse} from 'next/server.js';
const reply=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function commerceApi(action,req,u,sql){
 const member=u.role==='member',staff=['admin','manager','superadmin'].includes(u.role);
 if(!member&&!staff)return reply({error:'Access denied'},403);
 const gym=member?u.admin_id:u.role==='manager'?u.created_by:u.id,branch=u.role==='manager'?u.location_id:null;
 if(action==='payment-info'){
  if(req.method!=='GET')return reply({error:'Method not allowed'},405);
  const id=member?u.id:Number(new URL(req.url).searchParams.get('memberId'));
  if(!Number.isInteger(id)||id<1)return reply({error:'Select member'},400);
  const [target]=await sql`SELECT id FROM members WHERE id=${id} AND (${u.role}='superadmin' OR admin_id=${gym}) AND (${!branch} OR location_id=${branch})`;
  if(!target)return reply({error:'Member not found'},404);
  const [memberships,payments,orders,cart]=await Promise.all([
   sql`SELECT id,plan_name,amount,paid,amount-paid AS due,valid_from,valid_to FROM membership_assignments WHERE member_id=${id} ORDER BY id DESC`,
   sql`SELECT p.id,p.amount,p.method,p.paid_on,a.plan_name FROM membership_payments p JOIN membership_assignments a ON a.id=p.assignment_id WHERE a.member_id=${id} ORDER BY p.id DESC`,
   sql`SELECT id,items,amount,method,paid_at,created_at FROM supplement_orders WHERE member_id=${id} ORDER BY id DESC`,
   sql`SELECT c.product_id,c.quantity,p.name,p.price FROM supplement_cart c JOIN gym_supplements p ON p.id=c.product_id WHERE c.member_id=${id} AND NOT p.archived`
  ]);return reply({memberships,payments,orders,cart});
 }
 if(action==='supplements'){
  if(req.method==='GET')return reply(await sql`SELECT id,name,description,price FROM gym_supplements WHERE admin_id=${gym} AND NOT archived ORDER BY id DESC`);
  if(!['admin','manager'].includes(u.role))return reply({error:'Access denied'},403);
  const b=await req.json();
  if(req.method==='POST'){
   const price=Number(b.price);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100||!Number.isFinite(price)||price<=0||price>99999999||typeof b.description!=='string'||b.description.length>1000)return reply({error:'Enter a name, description and valid price'},400);
   const [row]=await sql`INSERT INTO gym_supplements(admin_id,name,description,price) VALUES(${gym},${b.name.trim()},${b.description},${price.toFixed(2)}) RETURNING id`;return reply(row,201);
  }
  if(req.method==='DELETE'){const rows=await sql`UPDATE gym_supplements SET archived=TRUE WHERE id=${Number(b.id)||0} AND admin_id=${gym} RETURNING id`;return rows.length?reply({ok:true}):reply({error:'Product not found'},404);}
 }
 if(action==='supplement-cart'&&member){
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const b=await req.json(),quantity=Number(b.quantity),id=Number(b.productId);
  if(!Number.isInteger(quantity)||quantity<0||quantity>99||!Number.isInteger(id))return reply({error:'Invalid quantity'},400);
  if(quantity===0){await sql`DELETE FROM supplement_cart WHERE member_id=${u.id} AND product_id=${id}`;return reply({ok:true});}
  const rows=await sql`INSERT INTO supplement_cart(member_id,product_id,quantity) SELECT ${u.id},id,${quantity} FROM gym_supplements WHERE id=${id} AND admin_id=${gym} AND NOT archived ON CONFLICT(member_id,product_id) DO UPDATE SET quantity=excluded.quantity RETURNING product_id`;
  return rows.length?reply({ok:true}):reply({error:'Product unavailable'},404);
 }
 if(action==='supplement-orders'){
  if(req.method==='GET'&&staff)return reply(await sql`SELECT o.*,m.name,m.public_id AS "memberId" FROM supplement_orders o JOIN members m ON m.id=o.member_id WHERE (${u.role}='superadmin' OR o.admin_id=${gym}) AND (${!branch} OR m.location_id=${branch}) ORDER BY o.id DESC`);
  if(req.method==='POST'&&member){
   const b=await req.json();if(typeof b.requestKey!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestKey))return reply({error:'Invalid request'},400);
   const [,rows]=await sql.transaction([sql`SELECT pg_advisory_xact_lock(9357,${u.id})`,sql`WITH contents AS (SELECT c.product_id,c.quantity,p.name,p.price FROM supplement_cart c JOIN gym_supplements p ON p.id=c.product_id WHERE c.member_id=${u.id} AND p.admin_id=${gym} AND NOT p.archived), added AS (INSERT INTO supplement_orders(member_id,admin_id,items,amount,request_key) SELECT ${u.id},${gym},jsonb_agg(jsonb_build_object('productId',product_id,'name',name,'quantity',quantity,'price',price)),sum(quantity*price),${b.requestKey} FROM contents HAVING count(*)>0 AND NOT EXISTS(SELECT 1 FROM supplement_orders WHERE member_id=${u.id} AND request_key=${b.requestKey}) ON CONFLICT DO NOTHING RETURNING id), cleared AS (DELETE FROM supplement_cart WHERE member_id=${u.id} AND EXISTS(SELECT 1 FROM added)) SELECT id FROM added UNION ALL SELECT id FROM supplement_orders WHERE member_id=${u.id} AND request_key=${b.requestKey}`]);
   return rows.length?reply(rows[0],201):reply({error:'Your cart is empty'},400);
  }
  if(req.method==='PATCH'&&['admin','manager'].includes(u.role)){
   const b=await req.json();if(!['Cash','Online'].includes(b.method))return reply({error:'Select Cash or Online'},400);
   const rows=await sql`UPDATE supplement_orders o SET method=${b.method},paid_at=now(),paid_by=${u.id} FROM members m WHERE o.id=${Number(b.id)||0} AND o.member_id=m.id AND o.admin_id=${gym} AND (${!branch} OR m.location_id=${branch}) AND o.paid_at IS NULL RETURNING o.id`;
   return rows.length?reply({ok:true}):reply({error:'Order unavailable or already paid'},409);
  }
 }
 return reply({error:'Method not allowed'},405);
}
