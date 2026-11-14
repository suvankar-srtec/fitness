import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import {runInNewContext} from 'node:vm';
import {validateMember,memberToday} from '../lib/members.mjs';import {memberFormDates} from '../lib/member-dates.mjs';import {normalizeEmail} from '../lib/email-otp.mjs';import {PAYMENT_MODES} from '../lib/payments.mjs';import {subscriptionError} from '../lib/gym-subscription.mjs';
const require=createRequire(import.meta.url),source=readFileSync(new URL('../app/api/[action]/route.js',import.meta.url),'utf8'),ast=require('next/dist/compiled/babel/parser').parse(source,{sourceType:'module'}),fn=ast.program.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='handle');
const user={id:8,role:'admin',account_enabled:true,password_ready:true,subscription_active:true};
function handler(sql,extra={}){const response=(body,status=200)=>Response.json(body,{status});return runInNewContext(source.slice(fn.start,fn.end)+';handle',{response,fail:(error,status)=>response({error},status),database:()=>sql,sameRequestOrigin:()=>true,normalizeEmail,tokenHash:()=>'',withAuditActor:sql=>sql,subscriptionError,validateMember,memberToday,memberFormDates,PAYMENT_MODES,console:{error(){}},URL,SyntaxError,Error,...extra});}
function request(method,body){const req=new Request('https://app.test/api/members',{method,body:JSON.stringify(body)});req.cookies={get:()=>({value:'session'})};return req;}
test('registration ignores forged validity and derives dates from the saved plan',async()=>{
 let saved;const sql=async(strings)=>{if(strings.join('?').includes('JOIN sessions'))return [user];throw Error('Unexpected query');};
 const run=handler(sql,{resolveGymLocation:async()=>({id:3}),registrationCharge:async()=>({durationDays:30}),normalizeMemberPicture:async()=>null,createRegisteredMember:async(sql,args)=>{saved=args.m;return {id:1,public_id:'ME-FIDU-01'};},after(){}});
 const body={name:'Member',phone:'9876543210',country:'IN',planId:1,gender:'Male',status:'Active',age:30,address:'',interestedArea:'',validFrom:'2000-01-01',validTo:'2099-01-01',paymentMode:'Cash',registrationToken:'a'.repeat(64)};
 const response=await run(request('POST',body),{params:{action:'members'}});assert.equal(response.status,201);assert.equal(saved.validFrom,memberToday());assert.deepEqual({validFrom:saved.validFrom,validTo:saved.validTo},memberFormDates({duration_days:30}));
});
test('member edits reject date changes even for an existing record without a plan',async()=>{
 const sql=async(strings)=>strings.join('?').includes('JOIN sessions')?[user]:[{id:1,admin_id:8,plan_id:null,valid_from:'2026-11-01',valid_to:'2026-12-01'}];
 const response=await handler(sql)(request('PATCH',{id:1,validFrom:'2026-11-02',validTo:'2026-12-01'}),{params:{action:'members'}});assert.equal(response.status,409);assert.match((await response.json()).error,/dates cannot be changed/);
});
