import test from 'node:test';
import assert from 'node:assert/strict';
import {employeeDetails} from '../lib/employee-details.js';
const request=id=>new Request('https://gym.test/api/employee-details?id='+id);
test('employee view rejects unauthorized roles, invalid IDs and missing manager assignment',async()=>{
 const sql=()=>{throw Error('Must not query');};
 for(const role of ['member','supervisor'])assert.equal((await employeeDetails(request(9),{role},sql)).status,403);
 assert.equal((await employeeDetails(request(9),{role:'manager'},sql)).status,403);
 assert.equal((await employeeDetails(request('bad'),{role:'admin',id:8},sql)).status,400);
});
test('employee view scopes manager to gym and branch and derives attendance for today',async()=>{
 const sql=async(strings,...values)=>{
  const query=strings.join('?');assert.match(query,/staff_attendance/);assert.match(query,/a.location_id=u.location_id/);assert.match(query,/u.role IN \('manager','supervisor'\)/);
  assert.deepEqual(values.slice(1),[9,false,8,false,3]);
  return [{id:9,name:'Employee',phone:'+919831134311',email:'staff@example.com',locationName:'Assigned branch',attendanceStatus:'Absent'}];
 };
 const response=await employeeDetails(request(9),{role:'manager',created_by:8,location_id:3},sql);
 const person=await response.json();assert.equal(person.attendanceStatus,'Absent');assert.match(person.date,/^\d{4}-\d{2}-\d{2}$/);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('employee view does not expose missing or out-of-scope staff',async()=>{
 assert.equal((await employeeDetails(request(9),{role:'admin',id:8},async()=>[])).status,404);
});
