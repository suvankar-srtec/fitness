import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paymentNotifications} from '../lib/payment-notifications.mjs';
const membership={id:1,memberId:'mem01',name:'Member',plan_name:'Monthly',amount:'100',paid:'0',due:'100',valid_from:'2026-11-01'};
test('pending and partial balances create notices; settled memberships do not',()=>{assert.equal(paymentNotifications([membership],[])[0].title,'Payment pending');assert.equal(paymentNotifications([{...membership,paid:'25',due:'75'}],[])[0].title,'Partial payment');assert.equal(paymentNotifications([{...membership,paid:'100',due:'0'}],[]).length,0);});
test('payment notices preserve actual method and amount and sort newest first',()=>{const result=paymentNotifications([membership],[{id:8,member_id:1,assignment_id:1,name:'Member',plan_name:'Monthly',amount:'20.50',paid_on:'2026-11-03',method:'Online'}]);assert.equal(result[0].type,'received');assert.equal(result[0].method,'Online');assert.equal(result[0].amount,'20.50');assert.equal(result[0].receipt,'PAY00008');assert.equal(result[0].memberId,'mem01');});
