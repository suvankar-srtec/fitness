import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePlan} from '../lib/plans.mjs';
const valid={name:' Bronze ',durationDays:'30',amount:'1000.50',description:' Standard '};
test('plan values normalize without losing money precision',()=>{assert.deepEqual(validatePlan(valid),{name:'Bronze',durationDays:30,amount:'1000.50',description:'Standard'});assert.equal(validatePlan({...valid,amount:'0'}).amount,'0');});
test('invalid amounts and durations are rejected',()=>{for(const amount of ['','-1','1.234','Infinity','1e3'])assert.ok(validatePlan({...valid,amount}).error);for(const durationDays of ['',0,-1,1.5,'wrong'])assert.ok(validatePlan({...valid,durationDays}).error);assert.ok(validatePlan({...valid,description:'x'.repeat(1001)}).error);});
