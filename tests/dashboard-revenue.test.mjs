import test from 'node:test';import assert from 'node:assert/strict';import {dashboardRevenue} from '../lib/dashboard-revenue.mjs';
const rows=[{date:'2026-10-01',method:'Cash',amount:'1000'},{date:'2026-11-09',method:'Cash',amount:'500'},{date:'2026-11-10',method:'Cash',amount:'100'},{date:'2026-11-15',method:'Online',amount:'200'},{date:'2026-11-16',method:' cash ',amount:'300'},{date:'2026-11-17',method:'Online',amount:'900'}];
test('seven-day revenue includes today and six earlier dates while excluding future payments',()=>{
 const data=dashboardRevenue(rows,'2026-10-01','2026-11-16','2026-11-16');assert.equal(data.sevenDaysFrom,'2026-11-10');assert.equal(data.sevenDaysTotal,600);assert.equal(data.total,2100);assert.deepEqual(data.modes,{Cash:1900,Online:200});
});
test('payment modes and selected total change together when the date range changes',()=>{
 const data=dashboardRevenue(rows,'2026-11-15','2026-11-16','2026-11-16');assert.equal(data.total,500);assert.deepEqual(data.modes,{Cash:300,Online:200});assert.equal(data.sevenDaysTotal,600);assert.equal(data.total,data.modes.Cash+data.modes.Online);
 const empty=dashboardRevenue(rows,'2026-09-01','2026-09-30','2026-11-16');assert.equal(empty.total,0);assert.deepEqual(empty.modes,{Cash:0,Online:0});
});
test('seven-day boundary works across a month and year change',()=>{const data=dashboardRevenue([{date:'2025-12-28',method:'Online',amount:75},{date:'2025-12-27',method:'Cash',amount:90}], '2026-01-01','2026-01-03','2026-01-03');assert.equal(data.sevenDaysFrom,'2025-12-28');assert.equal(data.sevenDaysTotal,75);assert.equal(data.total,0);});

test('location selection scopes monthly revenue and all payment modes',()=>{const rows=[{date:'2026-11-18',location:'Dum Dum',amount:500,method:'Cash'},{date:'2026-11-18',location:'Salt Lake',amount:300,method:'Online'},{date:'2026-11-01',location:'Dum Dum',amount:200,method:'Online'}];const d=dashboardRevenue(rows,'2026-11-01','2026-11-19','2026-11-19','Dum Dum');assert.equal(d.total,700);assert.deepEqual(d.modes,{Cash:500,Online:200});assert.equal(d.sevenDaysTotal,500);assert.equal(dashboardRevenue(rows,'2026-11-01','2026-11-19','2026-11-19','All').total,1000);});
