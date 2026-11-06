import test from 'node:test';import assert from 'node:assert/strict';
import {calendarMonth,moveCalendarMonth,timeSpentLabel} from '../lib/time-calendar.mjs';
import {gymTimeCalendar} from '../lib/gym-time-report.js';
test('calendar handles leap months, Monday offsets, and year navigation',()=>{
 assert.equal(calendarMonth('2028-02').days,29);assert.equal(calendarMonth('2026-02').days,28);assert.equal(calendarMonth('2026-11').offset,6);assert.equal(moveCalendarMonth('2026-12',1),'2027-01');assert.equal(moveCalendarMonth('2026-01',-1),'2025-12');assert.equal(calendarMonth('2026-13'),null);assert.equal(timeSpentLabel(95),'1h 35m');assert.equal(timeSpentLabel(null),'Exit not scanned');
});
test('member calendar ignores a forged member ID and always loads session owner',async()=>{
 let calls=0;const sql=async(strings,...values)=>{calls++;if(calls===1){assert.deepEqual(values,[46,8,true,null]);return [{id:46,memberId:'mem46',name:'Own account'}];}assert.deepEqual(values,[46,'2026-11-01','2026-11-30']);return [{date:'2026-11-06',minutes:90}];};
 const response=await gymTimeCalendar(new Request('https://gym.test/api/member-time-calendar?memberId=999&month=2026-11'),{role:'member',id:46,admin_id:8},sql);assert.equal(response.status,200);assert.equal((await response.json()).member.id,46);
});
test('manager calendar keeps gym/location scope and hides inaccessible members',async()=>{
 const sql=async(strings,...values)=>{assert.deepEqual(values,[46,8,false,3]);return [];};
 const response=await gymTimeCalendar(new Request('https://gym.test/api/member-time-calendar?memberId=46&month=2026-11'),{role:'manager',created_by:8,location_id:3},sql);assert.equal(response.status,404);
});
test('calendar rejects invalid month and unauthorized role without querying',async()=>{
 const sql=()=>{throw Error('Unexpected query');};
 assert.equal((await gymTimeCalendar(new Request('https://gym.test?month=bad'),{role:'admin',id:8},sql)).status,400);
 assert.equal((await gymTimeCalendar(new Request('https://gym.test'),{role:'supervisor'},sql)).status,403);
});
