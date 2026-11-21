import test from 'node:test';
import assert from 'node:assert/strict';
import {accountRoleLabel} from '../lib/account-role-label.mjs';
test('Quick Info identifies every account role and employee trainer designation',()=>{
 for(const [role,label] of [['admin','Admin'],['manager','Manager'],['member','Member'],['superadmin','Superadmin'],['supervisor','Employee']])assert.equal(accountRoleLabel({role}),label);
 assert.equal(accountRoleLabel({role:'supervisor',employeeRoleName:'Trainer'}),'Employee / Trainer');
 assert.equal(accountRoleLabel(null),'Account');
});
