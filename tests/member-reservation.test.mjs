import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveMemberId} from '../lib/member-reservation.mjs';
test('closing and reopening a member form reuses one unconsumed ID reservation',async()=>{
 const resource={current:null};let calls=0;
 const request=async()=>{calls++;return {registrationNo:'mem99',registrationToken:'sample'};};
 const first=reserveMemberId(resource,request,1000),reopened=reserveMemberId(resource,request,2000);
 assert.equal(first,reopened);assert.equal((await reopened).registrationNo,'mem99');assert.equal(calls,1);
 resource.current=null;await reserveMemberId(resource,request,3000);assert.equal(calls,2);
});
test('expired member reservations are replaced and failed requests do not freeze the next form',async()=>{
 const resource={current:null};let calls=0;
 const request=async()=>{calls++;if(calls===1)throw Error('Offline');return {registrationNo:'mem100'};};
 await assert.rejects(reserveMemberId(resource,request,1000),/Offline/);assert.equal(resource.current,null);
 await reserveMemberId(resource,request,2000);await reserveMemberId(resource,request,2000+111*60*1000);assert.equal(calls,3);
});
test('member reservation cache follows the expiry returned by the server and stays workspace-local',async()=>{
 let calls=0;const request=async()=>({registrationNo:'mem'+(++calls),expiresAt:new Date(100000).toISOString()});
 const first={current:null},otherAccount={current:null};await reserveMemberId(first,request,0);await reserveMemberId(first,request,60000);assert.equal(calls,1);
 await reserveMemberId(first,request,80000);assert.equal(calls,2);await reserveMemberId(otherAccount,request,0);assert.equal(calls,3);
});
