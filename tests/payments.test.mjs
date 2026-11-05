import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paymentAmount,PAYMENT_MODES} from '../lib/payments.mjs';
test('the supported payment modes are Cash and Online',()=>{assert.deepEqual(PAYMENT_MODES,['Cash','Online']);assert.ok(Object.isFrozen(PAYMENT_MODES));});
test('payment amounts retain decimal precision and require positive money values',()=>{
 assert.equal(paymentAmount('1000.50'),'1000.50');assert.equal(paymentAmount('0.01'),'0.01');assert.equal(paymentAmount('9999999999.99'),'9999999999.99');
 for(const value of ['',null,'0','0.00','-1','1.234','1e3','Infinity','10000000000.00'])assert.equal(paymentAmount(value),null);
});
