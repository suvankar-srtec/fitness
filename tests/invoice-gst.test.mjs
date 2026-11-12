import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGymBranding} from '../lib/gym-branding.mjs';
import {paymentBillHtml} from '../lib/payment-bill.mjs';
const gym={name:'Fit Gym',email:'office@example.com',gstNumber:'22AAAAA0000A1Z5',gstRate:18};
const data={gym,member:{name:'Member'},payments:[{id:1,amount:100,plan_name:'Plan',paid_on:'2026-11-12',method:'Cash'}],orders:[{id:1,amount:100,paid_at:'2026-11-12T10:00:00Z',items:[{name:'Product',price:100,quantity:1}]}]};
test('optional GST is validated and omitted without a GST number',()=>{const b={gymAddress:'Road',gymPhone:'9051668952',gymCountry:'IN',gymGstNumber: gym.gstNumber,gymGstRate:18};assert.equal(normalizeGymBranding(b).gstRate,18);assert.throws(()=>normalizeGymBranding({...b,gymGstNumber:'invalid'}));assert.throws(()=>normalizeGymBranding({...b,gymGstRate:101}));assert.equal(normalizeGymBranding({...b,gymGstNumber:''}).gstRate,0);});
test('membership and product invoices show additional GST and keep actual received amount',()=>{for(const key of ['membership-1','supplement-1']){const html=paymentBillHtml(data,key);assert.match(html,/GST Number: 22AAAAA0000A1Z5/);assert.match(html,/GST \(18%\)/);assert.match(html,/118\.00/);assert.match(html,/Amount received/);assert.doesNotMatch(html,/<footer>.*Email:/);assert.doesNotMatch(html,/Gym: Fit Gym/);assert.ok(html.indexOf('Payment Invoice</h1>')<html.indexOf('</header>'));}});
test('non-GST gym keeps a simple invoice',()=>{const html=paymentBillHtml({...data,gym:{name:'Gym'}},'membership-1');assert.doesNotMatch(html,/GST Number:|GST \(|Invoice total:/);});
