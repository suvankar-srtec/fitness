import {readFileSync} from 'node:fs';
import path from 'node:path';
import {parse} from 'opentype.js/dist/opentype.mjs';
function loadFont(path){const bytes=readFileSync(path);return parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));}
const regular=loadFont(path.join(process.cwd(),'assets/fonts/NotoSans-Regular.woff'));
const bold=loadFont(path.join(process.cwd(),'assets/fonts/NotoSans-Bold.woff'));
const decode=text=>text.replace(/&(amp|lt|gt|quot|apos);/g,(_,name)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[name]));
// Outlines render identically even when the server has no system fonts.
export function outlineGatePassText(svg){
 return svg.replace(/<text\b([^>]*)>([^<]*)<\/text>/g,(_match,attributes,encoded)=>{
  const attr=name=>attributes.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1];
  const font=Number(attr('font-weight')||400)>=600?bold:regular;
  const text=decode(encoded),size=Number(attr('font-size')||22),anchor=attr('text-anchor'),width=font.getAdvanceWidth(text,size);
  const x=Number(attr('x')||0)-(anchor==='middle'?width/2:anchor==='end'?width:0),y=Number(attr('y')||0);
  return `<path d="${font.getPath(text,x,y,size).toPathData(2)}" fill="${attr('fill')||'#111111'}"/>`;
 });
}
