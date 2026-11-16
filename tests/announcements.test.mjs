import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {announcementsApi,announcementAttachment} from '../lib/announcements-api.js';
const manager={id:20,role:'manager',created_by:17,location_id:3},member={id:101,role:'member',admin_id:17,location_id:3};
const req=(method='GET',body,url='https://test/api/announcements')=>new Request(url,{method,body:body?JSON.stringify(body):undefined});
test('announcement reads enforce organization and assigned location without exposing attachment contents',async()=>{
 for(const user of [manager,member]){let queried=false;const response=await announcementsApi('announcements',req('GET',null,'https://test/api/announcements?adminId=999&locationId=999'),user,async(strings,...values)=>{queried=true;const text=strings.join('?');assert.match(text,/a.admin_id=/);assert.match(text,/a.location_id IS NULL OR a.location_id=/);assert.match(text,/a.archived_at IS NULL/);assert.ok(values.includes(17));assert.ok(values.includes(3));assert.equal(values.includes(999),false);assert.doesNotMatch(text,/SELECT.*a.file_data,/);return [{id:1,title:'Update'}];});assert.equal(response.status,200);assert.equal(queried,true);}
});
test('members cannot publish, edit or delete announcements; unsupported roles cannot read them',async()=>{
 const noQuery=()=>{throw Error('Unexpected query');};for(const method of ['POST','PATCH','DELETE'])assert.equal((await announcementsApi('announcements',req(method,{title:'Update',id:1}),member,noQuery)).status,403);
 for(const role of ['supervisor','superadmin'])assert.equal((await announcementsApi('announcements',req(),{role},noQuery)).status,403);
 assert.equal((await announcementsApi('announcements',req(),{...manager,location_id:null},noQuery)).status,403);
});
test('manager posts only to their own location and cannot spoof the organization or author',async()=>{
 const queries=[];const sql=async(strings,...values)=>{const text=strings.join('?');queries.push({text,values});return text.includes('SELECT id')?[{id:3}]:[{id:1}];};
 const response=await announcementsApi('announcements',req('POST',{title:'Branch update',message:'Welcome',adminId:999,createdBy:999}),manager,sql);assert.equal(response.status,201);assert.deepEqual(queries.at(-1).values.slice(0,5),[17,3,20,'Branch update','Welcome']);
 assert.equal((await announcementsApi('announcements',req('POST',{title:'Wrong branch',locationId:9}),manager,sql)).status,403);
});
test('manager update and delete are restricted to their own branch announcements',async()=>{
 for(const method of ['PATCH','DELETE']){let scoped=false;const sql=async(strings,...values)=>{const text=strings.join('?');if(text.includes('SELECT id'))return [{id:3}];scoped=true;assert.match(text,/admin_id=/);assert.match(text,/location_id=.*AND created_by=/);assert.ok(values.includes(17));assert.ok(values.includes(3));assert.ok(values.includes(20));return [];};const response=await announcementsApi('announcements',req(method,{id:7,title:'Update'}),manager,sql);assert.equal(response.status,404);assert.equal(scoped,true);}
});
test('admin may publish to all locations but cannot select another organization location',async()=>{
 let saved;const sql=async(strings,...values)=>{if(strings.join('?').includes('SELECT id'))return [];saved=values;return [{id:1}];};
 assert.equal((await announcementsApi('announcements',req('POST',{title:'All members',message:'Hello'}),{id:17,role:'admin'},sql)).status,201);assert.equal(saved[1],null);
 assert.equal((await announcementsApi('announcements',req('POST',{title:'Wrong location',locationId:999}),{id:17,role:'admin'},sql)).status,403);
});
test('attachments are validated, images normalized, oversized or executable uploads rejected',async()=>{
 const image=await sharp({create:{width:5,height:9,channels:3,background:'red'}}).png().toBuffer();const normalized=await announcementAttachment({name:'poster.png',data:'data:image/png;base64,'+image.toString('base64')});assert.equal(normalized.type,'image/jpeg');assert.equal((await sharp(Buffer.from(normalized.data,'base64')).metadata()).format,'jpeg');
 const pdf=await announcementAttachment({name:'notice.pdf',data:'data:application/pdf;base64,'+Buffer.from('%PDF-1.4\nTest').toString('base64')});assert.equal(pdf.type,'application/pdf');
 await assert.rejects(()=>announcementAttachment({name:'bad.svg',data:'data:image/svg+xml;base64,'+Buffer.from('<svg/>').toString('base64')}));await assert.rejects(()=>announcementAttachment({name:'bad.pdf',data:'data:application/pdf;base64,'+Buffer.from('<html>bad</html>').toString('base64')}));await assert.rejects(()=>announcementAttachment({name:'big.pdf',data:'x'.repeat(2900001)}));
});
test('attachment download is scoped and PDF downloads cannot be interpreted as HTML',async()=>{
 let scoped=false;const response=await announcementsApi('announcement-file',req('GET',null,'https://test/api/announcement-file?id=1&adminId=999'),member,async(strings,...values)=>{scoped=true;assert.match(strings.join('?'),/admin_id=.*location_id IS NULL OR location_id=/);assert.ok(values.includes(17));assert.ok(values.includes(3));return [{file_type:'application/pdf',file_data:Buffer.from('%PDF-1.4').toString('base64')}];});assert.equal(response.status,200);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.match(response.headers.get('content-disposition'),/^attachment/);assert.equal(scoped,true);assert.equal(await response.text(),'%PDF-1.4');
});
