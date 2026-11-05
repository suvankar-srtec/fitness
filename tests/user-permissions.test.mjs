import test from 'node:test';
import assert from 'node:assert/strict';
import {isMainSuperadmin,canCreateGymAdmin} from '../lib/user-permissions.mjs';
test('sp00 is the only recognized superadmin',()=>{
 assert.equal(isMainSuperadmin({role:'superadmin',userId:'sp00'}),true);
 for(const user of [null,{role:'superadmin',userId:'sp01'},{role:'superadmin',userId:'sp02'},{role:'admin',userId:'sp00'},{role:'supervisor',userId:'sup01'}])assert.equal(isMainSuperadmin(user),false);
});
test('sp00 can create gym admins and sp01 cannot',()=>{
 assert.equal(canCreateGymAdmin({role:'superadmin',userId:'sp00'}),true);
 assert.equal(canCreateGymAdmin({role:'superadmin',userId:'sp01'}),false);
 assert.equal(canCreateGymAdmin({role:'superadmin',userId:'sp02'}),false);
 assert.equal(canCreateGymAdmin({role:'admin',userId:'ad01'}),false);
});
