import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {adminMemberAnalytics} from '../lib/admin-analytics.mjs';import {gymLogoApi} from '../lib/gym-logo-api.js';
test('admin charts derive plan distribution, membership state and six months of joins',()=>{
 const result=adminMemberAnalytics([{joined:'2026-11-01',plan:'Gold',status:'Active',valid_from:'2026-11-01',valid_to:'2026-12-01'},{joined:'2026-10-01',plan:'Gold',status:'Active',valid_from:'2026-10-01',valid_to:'2026-10-31'},{joined:'2026-11-06',plan:'Silver',status:'Active',valid_from:'2026-11-06',valid_to:'2026-12-06'}],'2026-11-07');assert.equal(result.active,2);assert.equal(result.other,1);assert.deepEqual(result.plans,[{name:'Gold',count:2},{name:'Silver',count:1}]);assert.equal(result.months.length,6);assert.equal(result.months.at(-1).count,2);assert.equal(result.months.at(-2).count,1);
});
test('admin and assigned manager may update their gym logo and posted IDs cannot change the target gym',async()=>{
 const logo='data:image/png;base64,'+(await sharp({create:{width:4,height:4,channels:3,background:'red'}}).png().toBuffer()).toString('base64');
 const request=()=>new Request('https://gym.test/api/gym-logo',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({gymLogo:logo,id:999})});let calls=0;
 const sql=async(strings,...values)=>{calls++;assert.match(strings.join('?'),/WHERE id=\? AND role='admin'/);assert.equal(values[1],8);assert.ok(values[0].startsWith('data:image/jpeg;base64,'));return [{id:8,role:'admin',gym_logo:values[0],gym_name:'Own Gym'}];};
 for(const role of ['manager','supervisor','member','superadmin'])assert.equal((await gymLogoApi(request(),{id:8,role},sql)).status,403);assert.equal(calls,0);
 const response=await gymLogoApi(request(),{id:8,role:'admin'},sql);assert.equal(response.status,200);assert.equal((await response.json()).gymId,8);assert.equal(calls,1);const managerResponse=await gymLogoApi(request(),{id:20,role:'manager',created_by:8,location_id:3},sql);assert.equal(managerResponse.status,200);assert.equal((await managerResponse.json()).role,'manager');assert.equal(calls,2);
});
