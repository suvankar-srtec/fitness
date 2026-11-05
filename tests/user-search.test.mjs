import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesUserSearch} from '../lib/user-search.mjs';
import {groupGymUsers} from '../lib/gym-user-groups.mjs';
const member={name:'Suvankar Das',memberId:'mem46',phone:'+919051668952',plan:'Platinum'};
test('user search matches national, international, partial and formatted phone numbers',()=>{
 for(const query of ['9051668952','+919051668952','+91 90516-68952','(90516) 68952','668952'])assert.equal(matchesUserSearch(member,query),true,query);
 assert.equal(matchesUserSearch(member,'9999999999'),false);
 assert.equal(matchesUserSearch(member,'unknown 9051668952'),false);
});
test('phone search preserves name, ID, plan and empty query matching',()=>{
 for(const query of ['SUVANKAR','mem46','Platinum','  '])assert.equal(matchesUserSearch(member,query),true);
 assert.equal(matchesUserSearch({name:'Missing phone'},'+91'),false);
});
test('formatted supervisor phone search retains its gym group',()=>{
 const result=groupGymUsers([{id:17,name:'Owner',role:'admin',gymName:'Fit Fusion'},{id:11,gymId:17,name:'Supervisor',role:'supervisor',phone:'+919051668952'}],'+91 90516 68952');
 assert.equal(result.gyms.length,1);assert.equal(result.gyms[0].users.length,2);
});
