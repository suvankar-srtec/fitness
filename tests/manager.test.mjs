import test from 'node:test';import assert from 'node:assert/strict';
import {managerScope,canManageBranchSupervisor,supervisorAssignment} from '../lib/manager-permissions.mjs';
import {managerAnalytics} from '../lib/manager-analytics.mjs';
import {sessionProfile} from '../lib/session-profile.mjs';
const manager={id:30,role:'manager',created_by:17,location_id:7,location_name:'Dum Dum'};
test('manager supervisor permissions are restricted to the assigned gym and branch',()=>{
 assert.deepEqual(managerScope(manager),{gymId:17,locationId:7});
 assert.equal(canManageBranchSupervisor(manager,{role:'supervisor',created_by:17,location_id:7}),true);
 for(const target of [{role:'supervisor',created_by:18,location_id:7},{role:'supervisor',created_by:17,location_id:8},{role:'manager',created_by:17,location_id:7}])assert.equal(canManageBranchSupervisor(manager,target),false);
 for(const body of [{gymAdminId:18},{locationId:8},{locationName:'Other branch'},{locationId:'7 OR 1=1'}])assert.equal(supervisorAssignment(manager,body),null);
 assert.deepEqual(supervisorAssignment(manager,{}),{gymId:17,locationId:7});
 assert.equal(managerScope({...manager,role:'admin'}),null);assert.equal(managerScope({...manager,location_id:null}),null);
});
test('supervisors sign in directly with their assigned gym and location',()=>{
 const profile=sessionProfile({id:11,role:'supervisor',public_id:'sup01',created_by:17,location_id:7,location_name:'Dum Dum',gym_name:'Fit Fusion'});
 assert.equal(profile.requiresLocationSelection,false);assert.equal(profile.gymName,'Fit Fusion');assert.equal(profile.gymId,17);assert.equal(profile.locationId,7);assert.equal(profile.locationName,'Dum Dum');
 const managerProfile=sessionProfile({...manager,public_id:'mgr01',gym_name:'Fit Fusion'});assert.equal(managerProfile.gymId,17);assert.equal(managerProfile.locationId,7);
});
test('manager charts switch between branch totals and individual attendance without counting pre-registration days',()=>{
 const data={today:'2026-11-06',members:[{id:1,name:'One',joined:'2026-11-05'},{id:2,name:'Two',joined:'2026-10-01'}],attendance:[{member_id:1,date:'2026-11-06'},{member_id:2,date:'2026-11-05'}]};
 const all=managerAnalytics(data);assert.equal(all.totalMembers,2);assert.equal(all.joinedThisMonth,1);assert.deepEqual(all.pie,{present:1,absent:1,total:2});assert.equal(all.bars.reduce((sum,bar)=>sum+bar.count,0),2);
 const individual=managerAnalytics(data,'1');assert.deepEqual(individual.pie,{present:1,absent:1,total:2});assert.equal(individual.bars.reduce((sum,bar)=>sum+bar.count,0),1);
});
