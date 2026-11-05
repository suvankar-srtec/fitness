// Keep text matching and phone formatting consistent across user directories.
export function matchesUserSearch(record,query='') {
 const term=String(query??'').trim().toLowerCase();
 if(!term)return true;
 const fields=['name','userId','memberId','public_id','phone','plan','plan_name','role','gymName','locationName'];
 if(fields.some(key=>String(record[key]??'').toLowerCase().includes(term)))return true;
 const digits=term.replace(/\D/g,'');
 return !!digits&&/^[+\d\s().-]+$/.test(term)&&String(record.phone??'').replace(/\D/g,'').includes(digits);
}
