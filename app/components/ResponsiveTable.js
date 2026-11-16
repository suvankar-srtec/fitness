import {tableCardChildren} from '../../lib/table-cards.mjs';
export default function ResponsiveTable({children,className='',...props}){
 return <table {...props} role={props.role||'table'} className={'mobile-record-table '+className}>{tableCardChildren(children)}</table>;
}
