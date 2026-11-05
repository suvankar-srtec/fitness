import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,tokenHash} from '../lib/password.mjs';
test('short and long passwords are accepted and verified exactly',async()=>{for(const password of ['x','a'.repeat(200),' spaced password ']){const stored=await hashPassword(password);assert.equal(await verifyPassword(password,stored),true);assert.equal(await verifyPassword(password+'x',stored),false);assert.notEqual(stored,password);}});
test('password salts are unique and session tokens are hashed',async()=>{assert.notEqual(await hashPassword('gym'),await hashPassword('gym'));assert.equal(tokenHash('token').length,64);assert.notEqual(tokenHash('token'),tokenHash('other'));});
