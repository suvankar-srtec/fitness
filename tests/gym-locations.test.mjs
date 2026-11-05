import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLocationName,resolveGymLocation} from '../lib/gym-locations.mjs';
test('location names normalize spaces and reject empty or invalid values',()=>{
 assert.equal(normalizeLocationName('  Salt   Lake  '),'Salt Lake');
 for(const value of ['',null,'  ','x'.repeat(121),'bad\u0000name'])assert.equal(normalizeLocationName(value),null);
});
test('location IDs are resolved only within the selected gym',async()=>{
 let parameters;
 const sql=async(_strings,...values)=>{parameters=values;return [];};
 await assert.rejects(resolveGymLocation(sql,17,{locationId:42}),/INVALID_GYM_LOCATION/);
 assert.deepEqual(parameters,[42,17]);
});

test('Main location is a retired placeholder and cannot be typed back into choices',async()=>{for(const value of ['Main location',' MAIN LOCATION ','Main   location'])assert.equal(normalizeLocationName(value),null);const sql=async()=>[{id:1,name:'Main location',admin_id:17}];await assert.rejects(resolveGymLocation(sql,17,{locationId:1}),/INVALID_GYM_LOCATION/);await assert.rejects(resolveGymLocation(sql,17,{locationName:'Main location'}),/GYM_LOCATION_REQUIRED/);});
test('typed locations are normalized and saved for reuse under the selected gym',async()=>{let parameters;const sql=async(strings,...values)=>{assert.match(strings.join(' '),/INSERT INTO gym_locations/);parameters=values;return [{id:7,name:values[0],admin_id:values[1]}];};const row=await resolveGymLocation(sql,17,{locationName:'  Salt   Lake  '});assert.deepEqual(parameters,['Salt Lake',17]);assert.deepEqual(row,{id:7,name:'Salt Lake',admin_id:17});});
