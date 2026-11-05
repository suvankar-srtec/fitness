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
