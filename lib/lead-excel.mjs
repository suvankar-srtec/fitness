export const LEAD_HEADERS=['Name','Number','Gender','Date of Birth','Last Description','Gym Location'];
async function workbook(){const module=await import('exceljs');return new (module.default||module).Workbook();}
function text(cell){
 const value=cell.value;
 if(value===null||value===undefined)return '';
 if(value instanceof Date)return value.toISOString().slice(0,10);
 if(typeof value==='object')throw Error('Formulas and formatted objects are not supported. Paste cell values only.');
 return String(value).trim();
}
export function normalizeLeadDate(value){
 if(!value)return '';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const match=/^(\d{2})[- /](\d{2})[- /](\d{4})$/.exec(value);
 if(match)return `${match[3]}-${match[2]}-${match[1]}`;
 throw Error('Use DD-MM-YYYY for Date of Birth');
}
export async function readLeadExcel(buffer){
 const book=await workbook();await book.xlsx.load(buffer);
 const sheet=book.getWorksheet('Leads')||book.worksheets[0];
 if(!sheet)throw Error('The workbook has no lead sheet');
 if(sheet.rowCount>201)throw Error('Upload up to 200 leads at a time');
 const header=sheet.getRow(1),columns={};
 header.eachCell((cell,index)=>{columns[text(cell).toLowerCase()]=index;});
 const indexes=LEAD_HEADERS.map(name=>columns[name.toLowerCase()]||(name==='Last Description'?columns.description:null));
 if(indexes.some(index=>!index))throw Error('Use the Sample Excel template with all six headers');
 const rows=[];
 for(let i=2;i<=sheet.rowCount;i++){
  const values=indexes.map(index=>text(sheet.getRow(i).getCell(index)));
  if(values.every(value=>!value))continue;
  const [name,phone,gender,dob,description,location]=values;
  try{rows.push({name,phone,gender:gender?gender[0].toUpperCase()+gender.slice(1).toLowerCase():'Other',dob:normalizeLeadDate(dob),description,location});}
  catch(error){throw Error(`Row ${i}: ${error.message}`);}
 }
 if(!rows.length)throw Error('Add lead details below the headers before uploading');
 return rows;
}
export async function createLeadExcel(rows=[]){
 const book=await workbook(),sheet=book.addWorksheet('Leads',{views:[{state:'frozen',ySplit:1}]});
 sheet.columns=LEAD_HEADERS.map((header,index)=>({header,key:String(index),width:[26,23,14,20,45,25][index]}));
 sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
 sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1763C5'}};
 sheet.getRow(1).height=25;
 for(const lead of rows)sheet.addRow([lead.name,lead.phone,lead.gender,lead.dob?lead.dob.split('-').reverse().join('-'):'',lead.last_description??lead.description??'',lead.location_name||'']);
 sheet.getColumn(2).numFmt='@';sheet.getColumn(4).numFmt='@';
 sheet.autoFilter='A1:F1';
 if(!rows.length){const notes=book.addWorksheet('Instructions');notes.getColumn(1).width=100;[
 'Fill the Leads sheet. Keep the six column headers unchanged.',
 'Name and Number are required. Include the country code in Number, for example +919876543210.',
 'Gender: Male, Female or Other. Date of Birth: DD-MM-YYYY (optional).',
 'Gym Location must match an existing location. Managers may import only to their assigned location.',
 'Up to 200 leads per upload. Existing active lead numbers are skipped. Invalid rows prevent the whole import.',
 'Example: Sample Lead | +919876543210 | Male | 01-01-2000 | Interested in joining | Your existing gym location'
 ].forEach(value=>notes.addRow([value]));}
 return book.xlsx.writeBuffer();
}
export async function downloadLeadExcel(rows){
 const buffer=await createLeadExcel(rows),url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const link=document.createElement('a');link.href=url;link.download='Leads.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
