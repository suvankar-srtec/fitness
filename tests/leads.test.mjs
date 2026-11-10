import test from 'node:test';import assert from 'node:assert/strict';import {validateLead} from '../lib/leads.mjs';import {leadsApi} from '../lib/leads-api.js';
const request=(method,b)=>new Request('https://gym.test/api/leads',{method,...(b?{body:JSON.stringify(b)}:{})});
test('members and non-gym roles cannot access leads',async()=>{for(const role of ['member','supervisor','superadmin'])assert.equal((await leadsApi(request('GET'),{id:7,role},()=>{throw Error('Unexpected SQL');})).status,403);});
test('lead validation normalizes phone and rejects future or malformed birth dates',()=>{const data={name:' Sample ',phone:'9876543210',country:'IN',gender:'Male',dob:'2000-01-01',description:' Query '};assert.equal(validateLead(data).phone,'+919876543210');assert.equal(validateLead(data).name,'Sample');assert.ok(validateLead({...data,dob:'2099-01-01'}).error);assert.ok(validateLead({...data,dob:'2026-02-30'}).error);assert.ok(validateLead({...data,phone:'abc'}).error);});
test('returning member is atomically scoped to its gym and keeps historical tables',async()=>{let query;const sql=async(parts,...values)=>{query={text:parts.join('?'),values};return [{id:2}];};const result=await leadsApi(request('POST',{memberId:42}),{id:7,role:'admin'},sql);assert.equal(result.status,201);assert.match(query.text,/UPDATE members SET archived_at=now\(\),status='Inactive'/);assert.match(query.text,/admin_id=\?/);assert.match(query.text,/INSERT INTO gym_leads/);assert.ok(!/DELETE FROM/.test(query.text));assert.match(query.text,/valid_to<\?/);assert.deepEqual(query.values.slice(0,4),[42,7,true,null]);});
test('unowned or already moved members do not create leads',async()=>{assert.equal((await leadsApi(request('POST',{memberId:42}),{id:7,role:'admin'},async()=>[])).status,404);});
test('activation requires admin access and an existing location selection',async()=>{assert.equal((await leadsApi(request('PATCH',{leadId:2,locationId:3}),{id:7,role:'manager'},()=>{throw Error('Unexpected SQL');})).status,403);assert.equal((await leadsApi(request('PATCH',{leadId:2,locationId:0}),{id:7,role:'admin'},()=>{throw Error('Unexpected SQL');})).status,400);});
test('activation restores the same scoped member and preserves plan and dates',async()=>{let query;const result=await leadsApi(request('PATCH',{leadId:2,locationId:3}),{id:7,role:'admin'},async(parts,...values)=>{query={text:parts.join('?'),values};return [{member_id:42}];});assert.equal(result.status,200);assert.match(query.text,/archived_at=NULL,status='Active',location_id=l.id/);assert.match(query.text,/lead.admin_id=\?/);assert.match(query.text,/l.admin_id=lead.admin_id/);assert.match(query.text,/activated_at=now\(\)/);assert.ok(!/SET[^;]*(valid_from=|valid_to=|plan_id=)/.test(query.text));assert.deepEqual(query.values,[2,7,true,null,3]);});
test('unowned lead or foreign location is rejected',async()=>{assert.equal((await leadsApi(request('PATCH',{leadId:2,locationId:3}),{id:7,role:'admin'},async()=>[])).status,409);});
test('manager lead listing is scoped to its gym and location',async()=>{let values;const result=await leadsApi(request('GET'),{id:9,role:'manager',created_by:7,location_id:3},async(parts,...v)=>{values=v;assert.match(parts.join('?'),/location_id=\?/);return [];});assert.equal(result.status,200);assert.deepEqual(values,[7,false,3]);});
test('manager cannot activate a lead in another location',async()=>{const result=await leadsApi(request('PATCH',{leadId:2,locationId:4}),{id:9,role:'manager',created_by:7,location_id:3},()=>{throw Error('Unexpected SQL');});assert.equal(result.status,403);});

test('new lead activation creates an unassigned member, links once and respects gym location',async()=>{const queries=[];const sql=async(parts,...values)=>{queries.push({text:parts.join('?'),values});return queries.length===1?[]:[{member_id:42}];};const result=await leadsApi(request('PATCH',{leadId:2,locationId:3}),{id:7,role:'admin'},sql);assert.equal(result.status,200);assert.match(queries[1].text,/FOR UPDATE OF lead/);assert.match(queries[1].text,/lead.member_id IS NULL/);assert.match(queries[1].text,/INSERT INTO members/);assert.match(queries[1].text,/'Not assigned'/);assert.match(queries[1].text,/l.admin_id=lead.admin_id/);assert.match(queries[1].text,/activated_at=now/);});

test('admin listing includes location names for manager-created leads',async()=>{
 const result=await leadsApi(request('GET'),{id:7,role:'admin'},async(parts,...values)=>{
  assert.match(parts.join('?'),/LEFT JOIN gym_locations/);
  assert.match(parts.join('?'),/location.name AS location_name/);
  assert.deepEqual(values,[7,true,null]);
  return [{id:2,location_id:3,location_name:'North'}];
 });
 assert.equal((await result.json())[0].location_name,'North');
});
test('admin can assign a lead only to an existing location in their gym without activating membership',async()=>{
 let query;
 const result=await leadsApi(request('PATCH',{leadId:2,locationId:3,operation:'assign-location'}),{id:7,role:'admin'},async(parts,...values)=>{
  query=parts.join('?');assert.deepEqual(values,[2,7,3]);return [{id:2,location_id:3,location_name:'North'}];
 });
 assert.equal(result.status,200);
 assert.match(query,/location.admin_id=lead.admin_id/);
 assert.match(query,/lead.activated_at IS NULL/);
 assert.doesNotMatch(query,/UPDATE members|activated_at=now/);
});
test('manager cannot reassign a lead and foreign locations cannot be assigned',async()=>{
 const body={leadId:2,locationId:4,operation:'assign-location'};
 assert.equal((await leadsApi(request('PATCH',body),{id:9,role:'manager',created_by:7,location_id:3},()=>{throw Error('Unexpected SQL');})).status,403);
 assert.equal((await leadsApi(request('PATCH',body),{id:7,role:'admin'},async()=>[])).status,404);
});
test('admin lead creation saves the selected gym location; managers inherit their assigned location',async()=>{
 const data={name:'Sample',phone:'9876543210',country:'IN',gender:'Male',description:'Query',locationId:'3'};
 for(const user of [{id:7,role:'admin'},{id:9,role:'manager',created_by:7,location_id:3}]){
  const queries=[];
  const sql=(parts,...values)=>{const query={text:parts.join('?'),values};queries.push(query);return Promise.resolve([{id:3}]);};
  sql.transaction=async statements=>Promise.all(statements);
  const result=await leadsApi(request('POST',data),user,sql);
  assert.equal(result.status,201);
  const insert=queries.find(q=>q.text.includes('INSERT INTO gym_leads'));
  assert.deepEqual(insert.values.slice(0,2),[7,3]);
 }
 assert.equal((await leadsApi(request('POST',data),{id:7,role:'admin'},async()=>[])).status,404);
 assert.equal((await leadsApi(request('POST',{...data,locationId:4}),{id:9,role:'manager',created_by:7,location_id:3},()=>{throw Error('Unexpected SQL');})).status,403);
});
