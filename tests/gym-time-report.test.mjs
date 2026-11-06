import test from 'node:test';
import assert from 'node:assert/strict';
import {gymTimeReport} from '../lib/gym-time-report.js';
const request=(query='')=>new Request('https://gym.test/api/gym-time-report'+query);
test('first/last report restricts manager to assigned gym and location',async()=>{
 let values;const sql=async(strings,...args)=>{values=args;assert.match(strings.join('?'),/a.source='qr'/);assert.match(strings.join('?'),/first_in_at/);return [{minutes:90}];};
 const result=await gymTimeReport(request('?from=2026-11-01&to=2026-11-06'),{role:'manager',created_by:8,location_id:3},sql);
 assert.equal(result.status,200);assert.deepEqual(values,[8,false,3,'2026-11-01','2026-11-06']);assert.equal((await result.json())[0].minutes,90);
 await gymTimeReport(request(),{role:'admin',id:8},sql);assert.equal(values[0],8);assert.equal(values[1],true);
});
test('report rejects unauthorized roles, missing assignment and invalid ranges before query',async()=>{
 const sql=()=>{throw Error('Must not query');};
 for(const role of ['member','supervisor','superadmin'])assert.equal((await gymTimeReport(request(),{role},sql)).status,403);
 assert.equal((await gymTimeReport(request(),{role:'manager'},sql)).status,403);
 for(const query of ['?from=invalid','?from=2026-11-06&to=2026-11-01','?from=2024-01-01&to=2026-01-01'])assert.equal((await gymTimeReport(request(query),{role:'admin',id:8},sql)).status,400);
});
