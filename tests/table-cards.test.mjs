import test from 'node:test';import assert from 'node:assert/strict';
import {createElement as h,Fragment} from 'react';
import {tableCardChildren} from '../lib/table-cards.mjs';
const cells=sections=>sections.find(s=>s.type==='tbody').props.children[0].props.children;
test('conditional columns retain the matching labels and existing actions',()=>{
 const click=()=>{};
 const sections=tableCardChildren([h('thead',{},h('tr',{},h('th',{},'ID'),false,h(Fragment,{},h('th',{},'Name'),h('th',{},'Actions')))),h('tbody',{},h('tr',{key:'record'},h('td',{},'ME-01'),false,h('td',{},'Member'),h('td',{},h('button',{onClick:click},'Edit'))))]);
 assert.deepEqual(cells(sections).map(c=>c.props['data-label']),['ID','Name','Actions']);assert.equal(cells(sections)[2].props['data-card-wide'],'true');assert.equal(cells(sections)[2].props.children.props.onClick,click);
});
test('formatted headers and empty states stay readable without misleading column labels',()=>{
 const sections=tableCardChildren([h('thead',{},h('tr',{},h('th',{},'Valid',h('br'),'until'),h('th',{},'Contact'))),h('tbody',{},h('tr',{},h('td',{colSpan:2},'No records')))]);
 assert.equal(cells(sections)[0].props['data-label'],'');assert.equal(cells(sections)[0].props.colSpan,2);assert.equal(cells(sections)[0].props['data-card-wide'],'true');
 const formatted=tableCardChildren([sections[0],h('tbody',{},h('tr',{},h('td',{},'2099-01-01'),h('td',{},'test@example.com')))]);assert.equal(cells(formatted)[0].props['data-label'],'Valid until');
});
test('explicit cell labels and table headings are preserved',()=>{
 const head=h('thead',{},h('tr',{},h('th',{scope:'col'},'Amount'))),sections=tableCardChildren([head,h('tbody',{},h('tr',{},h('td',{'data-label':'Total due'},'500')))]);
 assert.equal(sections[0].type,'thead');assert.deepEqual(sections[0].props,head.props);assert.equal(cells(sections)[0].props['data-label'],'Total due');
});
