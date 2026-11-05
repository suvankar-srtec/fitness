import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {validateMember,membershipEndDate,validDate,ageFromDateOfBirth,memberToday} from '../lib/members.mjs';
import {normalizeMemberPicture} from '../lib/member-picture.mjs';
const data={name:' Member ',phone:'9876543210',country:'IN',planId:'1',gender:'Male',status:'Active',age:'30',heightFt:'5.8',weightKg:'70.5',address:' Address ',interestedArea:' Strength ',validFrom:'2026-11-03',validTo:'2026-12-03'};
test('registration fields normalize and invalid dates or measurements fail',()=>{const member=validateMember(data);assert.equal(member.name,'Member');assert.equal(member.phone,'+919876543210');assert.equal(member.age,30);assert.equal(member.weight,70.5);assert.equal(member.address,'Address');for(const change of [{age:150},{heightFt:-1},{status:'Wrong'},{validTo:'2026-10-01'},{validFrom:'2026-02-30'}])assert.ok(validateMember({...data,...change}).error);});
test('plan duration calculates across month and leap year boundaries',()=>{assert.equal(membershipEndDate('2024-12-12',60),'2025-02-10');assert.equal(membershipEndDate('2024-02-28',2),'2024-03-01');assert.equal(validDate('2026-02-29'),false);assert.equal(membershipEndDate('2026-11-03',null),'');});
test('age updates on the birthday and handles leap days',()=>{
 assert.equal(ageFromDateOfBirth('2000-11-04','2026-11-03'),25);
 assert.equal(ageFromDateOfBirth('2000-11-04','2026-11-04'),26);
 assert.equal(ageFromDateOfBirth('2000-12-31','2026-01-01'),25);
 assert.equal(ageFromDateOfBirth('2000-02-29','2025-02-28'),24);
 assert.equal(ageFromDateOfBirth('2000-02-29','2025-03-01'),25);
 assert.equal(ageFromDateOfBirth('2026-02-30','2026-11-04'),null);
 assert.equal(ageFromDateOfBirth('2027-01-01','2026-11-04'),null);
});
test('server derives age from DOB instead of trusting the submitted age',()=>{
 assert.equal(validateMember({...data,dob:'2000-01-01',age:99}).age,ageFromDateOfBirth('2000-01-01'));
 assert.ok(validateMember({...data,dob:'2099-01-01'}).error);
 assert.ok(validateMember({...data,dob:'1900-01-01'}).error);
 assert.ok(validateMember({...data,dob:memberToday()}).error);
 assert.equal(validateMember(data).dob,null);
});
test('profile pictures are decoded and normalized, and fake images are rejected',async()=>{const image=await sharp({create:{width:800,height:600,channels:3,background:'#ff0000'}}).png().toBuffer();const base64=await normalizeMemberPicture('data:image/png;base64,'+image.toString('base64'));const result=await sharp(Buffer.from(base64,'base64')).metadata();assert.equal(result.format,'jpeg');assert.equal(result.width,512);assert.equal(result.height,384);await assert.rejects(normalizeMemberPicture('data:image/png;base64,aW52YWxpZA=='),/INVALID_PICTURE/);assert.equal(await normalizeMemberPicture(null),null);});
