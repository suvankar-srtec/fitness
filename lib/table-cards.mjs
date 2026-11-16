import {Children,Fragment,cloneElement,isValidElement} from 'react';
const flatten=children=>Children.toArray(children).flatMap(child=>isValidElement(child)&&child.type===Fragment?flatten(child.props.children):[child]);
function labelText(value){
 if(typeof value==='string'||typeof value==='number')return String(value);
 if(isValidElement(value))return value.props['aria-label']||labelText(value.props.children);
 return Array.isArray(value)?value.map(labelText).join(' '):'';
}
export function tableCardChildren(children){
 const sections=flatten(children),head=sections.find(section=>section.type==='thead');
 const headers=flatten(head?.props.children).flatMap(row=>flatten(row.props?.children)).flatMap(cell=>Array.from({length:cell.props?.colSpan||1},()=>labelText(cell).replace(/\s+/g,' ').trim()));
 return sections.map(section=>{
  if(!isValidElement(section)||!['tbody','tfoot'].includes(section.type))return section;
  return cloneElement(section,{},flatten(section.props.children).map(row=>{
   if(!isValidElement(row)||row.type!=='tr')return row;
   let column=0;
   return cloneElement(row,{role:row.props.role||'row'},flatten(row.props.children).map(cell=>{
    if(!isValidElement(cell)||!['td','th'].includes(cell.type))return cell;
    const span=Number(cell.props.colSpan)||1,label=span>1?'':headers[column]||'';column+=span;
    return cloneElement(cell,{'data-label':cell.props['data-label']??label,'data-card-wide':span>1||/actions?/i.test(label)?'true':undefined,role:cell.props.role||'cell'});
   }));
  }));
 });
}
