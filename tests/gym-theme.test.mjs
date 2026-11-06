import test from 'node:test';
import assert from 'node:assert/strict';
import {gymPalette,contrastRatio} from '../lib/gym-theme.mjs';
import {publicUser} from '../lib/user-profile.mjs';
const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16));
test('logo themes ignore white and transparent backgrounds and retain brand hue',()=>{
 const palette=gymPalette([255,255,255,255,255,255,255,255,240,20,20,255,0,0,255,0]);
 const [r,g,b]=rgb(palette.accent);assert.ok(r>g*3&&r>b*3);assert.ok(contrastRatio(rgb(palette.accent),[255,255,255])>=4.5);
});
test('light logo colours are adjusted for readable white labels',()=>{
 for(const color of [[255,240,0],[0,255,0],[0,200,255],[255,0,120]])assert.ok(contrastRatio(rgb(gymPalette([...color,255]).accent),[255,255,255])>=4.5);
 assert.equal(gymPalette([]).accent,'#111111');assert.equal(gymPalette([255,255,255,255]).accent,'#111111');
});
test('all gym staff profiles expose their resolved gym logo; superadmin stays neutral',()=>{
 for(const role of ['admin','manager','supervisor'])assert.equal(publicUser({role,gym_logo:'logo'}).gymLogo,'logo');
 assert.equal(publicUser({role:'superadmin',gym_logo:'legacy'}).gymLogo,'');
});
