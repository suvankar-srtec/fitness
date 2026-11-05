import test from 'node:test';
import assert from 'node:assert/strict';
import {groupGymUsers} from '../lib/gym-user-groups.mjs';
const users=[{id:1,role:'superadmin',userId:'sp00'}, {id:2,role:'admin',gymName:'Fit Fusion'}, {id:3,role:'supervisor',gymId:2,name:'Alex'}, {id:4,role:'admin',gymName:'Fit Fusion'}, {id:5,role:'supervisor',gymId:4}];
test('gym cards use ownership rather than gym names and keep superadmins separate',()=>{
 const result=groupGymUsers(users);
 assert.deepEqual(result.gyms.map(g=>g.users.map(u=>u.id)),[[2,3],[4,5]]);
 assert.equal(result.superadmins.length,1);
});
test('new supervisors join their gym card and search retains the gym context',()=>{
 assert.equal(groupGymUsers([...users,{id:6,role:'supervisor',gymId:2}]).gyms[0].users.length,3);
 assert.deepEqual(groupGymUsers(users,'alex').gyms[0].users.map(u=>u.id),[2,3]);
 assert.equal(groupGymUsers([...users,{id:7,role:'supervisor'}]).unassigned.length,1);
});
test('gym creator stays outside gym groups',()=>{
 const result=groupGymUsers(users.map(user=>user.role==='admin'?{...user,createdBy:1}:user));
 assert.deepEqual(result.gyms.map(gym=>gym.users.map(user=>user.id)),[[2,3],[4,5]]);
 assert.equal(result.superadmins.length,1);
 assert.equal(result.superadmins[0].gymId,undefined);
 assert.equal(groupGymUsers(users.map(user=>user.role==='admin'?{...user,createdBy:1}:user),'sp00').gyms.length,0);
});
test('sp00 stays outside gym cards even when creating a gym owner',()=>{
 const result=groupGymUsers([{id:10,role:'superadmin',userId:'sp00'},{id:11,role:'admin',gymName:'Gym',createdBy:10}]);
 assert.deepEqual(result.gyms[0].users.map(user=>user.id),[11]);
 assert.equal(result.superadmins[0].userId,'sp00');
});

test('former superadmins are not displayed in gym groups or the platform card',()=>{const result=groupGymUsers([...users,{id:20,role:'superadmin',userId:'sp01'}]);assert.equal(result.superadmins.length,1);assert.equal(result.superadmins[0].userId,'sp00');assert.equal(result.gyms.some(gym=>gym.users.some(user=>user.role==='superadmin')),false);});
