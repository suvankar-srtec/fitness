import test from 'node:test';import assert from 'node:assert/strict';
import {adminRecentActivity,recordGymScan} from '../lib/admin-recent-activity.js';
import {gatePassApi} from '../lib/gate-pass-api.js';
test('recent activity is scoped to the gym and limits scans to ten rows',async()=>{
 let count=0;const sql=async(strings,...values)=>{count++;const query=strings.join('?');if(query.includes('gym_scan_events')){assert.match(query,/LIMIT 10/);assert.deepEqual(values,[8,true,null]);return [];}if(query.includes('generate_series'))return [];if(query.includes('membership_payments')){assert.deepEqual(values,[8,true,null]);assert.match(query,/a.admin_id=/);return [{date:'2026-11-01',method:'Cash',amount:'2000'}];}if(query.includes('m.public_id AS')){assert.deepEqual(values,[8,true,null]);assert.match(query,/m.archived_at IS NULL/);return [];}assert.equal(values[1],8);assert.match(query,/a.source='qr'/);return [{present:2,absent:1}];};
 const response=await adminRecentActivity(new Request('https://gym.test/api/admin-recent-activity'),{role:'admin',id:8},sql);assert.equal(response.status,200);assert.equal(count,5);assert.deepEqual(await response.json(),{scans:[],attendance:[],revenue:[{date:'2026-11-01',method:'Cash',amount:'2000'}],members:[],summary:{present:2,absent:1}});
});
test('members, supervisors and managers cannot read gym-wide activity',async()=>{for(const role of ['member','supervisor','manager','superadmin']){const response=await adminRecentActivity(new Request('https://gym.test'),{role},()=>{throw Error('Unexpected query');});assert.equal(response.status,403);}});
test('scan history stores outcome and assigned scope without QR secrets',async()=>{
 const sql=async(strings,...values)=>{assert.match(strings.join('?'),/INSERT INTO gym_scan_events/);assert.deepEqual(values,[8,3,11,null,'Rejected','Wrong gym']);return [];};await recordGymScan(sql,{created_by:8,location_id:3,id:11},{result:'Rejected',reason:'Wrong gym'});
});
test('invalid QR attempts are persisted as rejected without marking attendance',async()=>{
 let logged=false;const sql=async(strings,...values)=>{const query=strings.join('?');assert.ok(!query.includes('INSERT INTO attendance'));if(query.includes('INSERT INTO gym_scan_events')){logged=true;assert.equal(values[4],'Rejected');}return [];};
 const request=new Request('https://gym.test/api/gate-pass-scan',{method:'POST',body:JSON.stringify({qr:'not a pass'})});assert.equal((await gatePassApi('gate-pass-scan',request,{role:'supervisor',id:11,created_by:8,location_id:3},sql)).status,400);assert.equal(logged,true);
});
