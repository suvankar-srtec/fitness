import test from 'node:test';
import assert from 'node:assert/strict';
import {gymTimeReport} from '../lib/gym-time-report.js';
const request=(query='')=>new Request('https://gym.test/api/gym-time-report'+query);
test('first/last report restricts manager to assigned gym and location',async()=>{
 let values;const sql=async(strings,...args)=>{values=args;assert.match(strings.join('?'),/a.source='qr'/);assert.match(strings.join('?'),/first_in_at/);return [{minutes:90}];};
 const result=await gymTimeReport(request('?from=2026-11-01&to=2026-11-06'),{role:'manager',created_by:8,location_id:3},sql);
 assert.equal(result.status,200);assert.deepEqual(values,[8,false,3,'2026-11-01','2026-11-06']);assert.equal((await result.json())[0].minutes,90);

});
test('report rejects unauthorized roles, missing assignment and invalid ranges before query',async()=>{
 const sql=()=>{throw Error('Must not query');};
 for(const role of ['member','supervisor','superadmin'])assert.equal((await gymTimeReport(request(),{role},sql)).status,403);
 assert.equal((await gymTimeReport(request(),{role:'manager'},sql)).status,403);
 for(const query of ['?from=invalid','?from=2026-11-06&to=2026-11-01','?from=2024-01-01&to=2026-01-01'])assert.equal((await gymTimeReport(request(query),{role:'admin',id:8},sql)).status,400);
});

test('admin report includes staff and members without ID collisions and uses historical gym scope',async()=>{
 let calls=0;
 const sql=async(strings,...values)=>{
  const query=strings.join('?');calls++;
  if(query.includes('staff_attendance')){
   assert.match(query,/a.admin_id=/);assert.match(query,/l.id=a.location_id/);assert.match(query,/u.role IN \('manager','supervisor'\)/);
   assert.deepEqual(values,[8,'2026-11-01','2026-11-06']);
   return [{id:1,staffRecordId:9,memberId:'mgr01',role:'manager',name:'Raj',date:'2026-11-06'}];
  }
  return [{id:1,memberRecordId:9,memberId:'mem01',name:'Member',date:'2026-11-06'}];
 };
 const result=await gymTimeReport(request('?from=2026-11-01&to=2026-11-06'),{role:'admin',id:8},sql);
 const rows=await result.json();assert.equal(calls,2);assert.equal(rows.length,2);assert.deepEqual(new Set(rows.map(row=>row.role)),new Set(['member','manager']));assert.equal(new Set(rows.map(row=>row.id)).size,2);
});

test('admin report starts member and employee reads before either finishes',async()=>{
 const pending=[];
 const sql=()=>new Promise(resolve=>pending.push(resolve));
 const result=gymTimeReport(request('?from=2026-11-01&to=2026-11-06'),{role:'admin',id:8},sql);
 assert.equal(pending.length,2);
 pending.forEach(resolve=>resolve([]));
 assert.deepEqual(await (await result).json(),[]);
});
