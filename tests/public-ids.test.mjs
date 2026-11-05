import {test} from 'node:test';
import assert from 'node:assert/strict';
import {memberPublicId} from '../lib/public-ids.mjs';
import {memberIdFromQr} from '../lib/qr-scanner.mjs';
import {paymentReportCsv} from '../lib/payment-report.mjs';
test('persisted public IDs take precedence over numeric database IDs',()=>{assert.equal(memberPublicId({id:250,public_id:'mem01'}),'mem01');assert.equal(memberPublicId({member_id:250,memberId:'mem02'}),'mem02');assert.equal(memberPublicId({member_id:1}),'mem01');});
test('new QR IDs normalize without breaking previously issued QR codes',()=>{assert.equal(memberIdFromQr('mem01'),'mem01');assert.equal(memberIdFromQr('MEM12'),'mem12');assert.equal(memberIdFromQr('{"memberId":"mem123"}'),'mem123');assert.equal(memberIdFromQr('MEM00250'),'MEM00250');assert.equal(memberIdFromQr('ad01'),null);});
test('CSV exports the persisted registration ID',()=>{assert.ok(paymentReportCsv([{id:1,member_id:250,memberId:'mem01',name:'Member',amount:'10.00',paid_on:'2026-11-03',method:'Cash',plan_name:'Monthly',reference:''}]).includes('"mem01"'));});
