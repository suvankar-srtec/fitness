import test from 'node:test';
import assert from 'node:assert/strict';
import { publicUser } from '../lib/user-profile.mjs';

test('superadmin has no gym even if a legacy gym value exists', () => {
 assert.equal(publicUser({role:'superadmin',gym_name:'Legacy gym'}).gymName, '');
});
test('gym owner uses the assigned gym name independently of personal name', () => {
 assert.equal(publicUser({role:'admin',name:'Owner',gym_name:'Fit Fusion'}).gymName, 'Fit Fusion');
 assert.equal(publicUser({role:'admin',name:'Owner'}).gymName, '');
});
test('supervisor profile preserves the gym resolved from its admin', () => {
 assert.equal(publicUser({role:'supervisor',gym_name:'Fit Fusion'}).gymName, 'Fit Fusion');
});
