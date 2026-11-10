import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterPayments,totalPayments,paymentReportCsv} from '../lib/payment-report.mjs';
const records=[{id:1,member_id:1,name:'Test',amount:'0.10',paid_on:'2026-11-01',method:'Cash',plan_name:'Monthly',reference:''},{id:2,member_id:2,name:'Second',amount:'0.20',paid_on:'2026-11-03',method:'Online',plan_name:'Annual',reference:'Ref'}];
test('date boundaries and payment method filters combine correctly',()=>{assert.equal(filterPayments(records,{from:'2026-11-01',to:'2026-11-03',method:'All'}).length,2);assert.equal(filterPayments(records,{from:'2026-11-03',method:'Online'})[0].id,2);assert.equal(filterPayments(records,{to:'2026-10-31'}).length,0);});
test('report totals use exact decimal arithmetic',()=>{assert.equal(totalPayments(records),'0.30');assert.equal(totalPayments([]),'0.00');});
test('CSV quotes special characters and prevents spreadsheet formula injection',()=>{const csv=paymentReportCsv([{...records[0],name:' =SUM(1,2)',reference:'Text "quoted",\nnext line'}]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\' =SUM(1,2)"'));assert.ok(csv.includes('"Text ""quoted"",\nnext line"'));assert.ok(!csv.includes('PAY00001'));});
