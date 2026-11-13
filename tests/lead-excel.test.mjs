import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {createLeadExcel,readLeadExcel,LEAD_HEADERS} from '../lib/lead-excel.mjs';
import {importLeads} from '../lib/lead-import.mjs';
const lead={name:'Sample Lead',phone:'+919876543210',gender:'Male',dob:'2000-01-02',description:'Trial requested',location_name:'North'};
test('Excel export preserves international phone, dates and notes on import',async()=>{
 const rows=await readLeadExcel(await createLeadExcel([lead]));
 assert.deepEqual(rows,[{name:lead.name,phone:lead.phone,gender:'Male',dob:'2000-01-02',description:lead.description,location:'North'}]);
});
test('sample workbook has headers and no fake leads',async()=>{
 const book=new ExcelJS.Workbook();await book.xlsx.load(await createLeadExcel());
 assert.deepEqual(book.getWorksheet('Leads').getRow(1).values.slice(1),LEAD_HEADERS);
 await assert.rejects(async()=>readLeadExcel(await book.xlsx.writeBuffer()),/Add lead details/);
});
async function awaitBuffer(book){return book.xlsx.writeBuffer();}
test('Excel import rejects missing headers and formulas',async()=>{
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Leads');sheet.addRow(['Name']);
 await assert.rejects(async()=>readLeadExcel(await book.xlsx.writeBuffer()),/six headers/);
 sheet.getRow(1).values=LEAD_HEADERS;sheet.addRow([{formula:'1+1'},lead.phone,'Male','','','']);
 await assert.rejects(async()=>readLeadExcel(await book.xlsx.writeBuffer()),/Formulas/);
});
function mockSql(){const queries=[];let writes=0;const sql=(parts,...values)=>{const query={text:parts.join('?'),values};queries.push(query);return query.text.startsWith('SELECT id,name')?Promise.resolve([{id:3,name:'North'},{id:4,name:'South'}]):query;};sql.transaction=async items=>{writes++;return items.map((item,index)=>index===items.length-1?[{id:1}]:[]);};return {sql,queries,get writes(){return writes;}};}
const row={...lead,location:'North'};
test('manager import inherits gym and enforces assigned location before writes',async()=>{
 const mock=mockSql(),user={id:9,role:'manager',created_by:7,location_id:3};
 assert.equal((await importLeads({rows:[{...row,location:'South'}]},user,mock.sql)).status,400);
 assert.equal(mock.writes,0);
 const result=await importLeads({rows:[row]},user,mock.sql);assert.equal(result.imported,1);
 const insert=mock.queries.find(q=>q.text.includes('INSERT INTO'));assert.equal(insert.values[0],7);assert.equal(JSON.parse(insert.values[1])[0].location_id,3);
});
test('duplicate phone numbers and invalid rows reject the complete batch',async()=>{
 const mock=mockSql(),user={id:7,role:'admin'};
 assert.equal((await importLeads({rows:[row,row]},user,mock.sql)).status,400);
 assert.equal((await importLeads({rows:[row,{...row,phone:'bad'}]},user,mock.sql)).status,400);assert.equal(mock.writes,0);
});
test('nonstaff imports are denied without database access',async()=>{
 assert.equal((await importLeads({rows:[row]},{role:'member'},()=>{throw Error('Unexpected database access');})).status,403);
});

