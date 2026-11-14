import test from 'node:test';import assert from 'node:assert/strict';import {memberFormDates} from '../lib/member-dates.mjs';
test('creation dates are generated from the server date and plan duration',()=>{
 assert.deepEqual(memberFormDates({duration_days:30},null,'2026-11-14'),{validFrom:'2026-11-14',validTo:'2026-12-14'});
 assert.deepEqual(memberFormDates({duration_days:2},null,'2024-02-28'),{validFrom:'2024-02-28',validTo:'2024-03-01'});
});
test('editing keeps saved dates even when upgrading plans or enrolling an existing record',()=>{
 const existing={plan_id:1,valid_from:'2026-11-01',valid_to:'2026-11-30'};
 assert.deepEqual(memberFormDates({duration_days:365},existing,'2026-11-14'),{validFrom:'2026-11-01',validTo:'2026-11-30'});
 assert.deepEqual(memberFormDates({duration_days:365},{...existing,plan_id:null},'2026-11-14'),{validFrom:'2026-11-01',validTo:'2026-11-30'});
});
test('a record without saved validity receives automatic dates and invalid plan durations remain unavailable',()=>{
 assert.deepEqual(memberFormDates({duration_days:60},{valid_from:null,valid_to:null},'2026-11-14'),{validFrom:'2026-11-14',validTo:'2027-01-13'});
 assert.equal(memberFormDates({duration_days:null},null,'2026-11-14').validTo,'');
});
