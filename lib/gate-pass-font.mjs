import {readFileSync} from 'node:fs';
import path from 'node:path';
import {create} from 'fontkit';
const regular=create(readFileSync(path.join(process.cwd(),'assets/fonts/Montserrat-Regular.woff')));
const bold=create(readFileSync(path.join(process.cwd(),'assets/fonts/Montserrat-Bold.woff')));
const decode=text=>text.replace(/&(amp|lt|gt|quot|apos);/g,(_,name)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[name]));
export function wrapPassAddress(value,width=540,size=26){
 const address=String(value||'').trim().replace(/\s+/g,' ');
 if(!address)return [];
 const measure=text=>regular.layout(text).positions.reduce((sum,position)=>sum+position.xAdvance,0)*size/regular.unitsPerEm;
 if(measure(address)<=width)return [address];
 const words=address.split(' ');
 if(words.length===1){const characters=Array.from(address),middle=Math.ceil(characters.length/2);return [characters.slice(0,middle).join(''),characters.slice(middle).join('')];}
 let split=1,best=Infinity;
 for(let i=1;i<words.length;i++){const maximum=Math.max(measure(words.slice(0,i).join(' ')),measure(words.slice(i).join(' ')));if(maximum<best){best=maximum;split=i;}}
 return [words.slice(0,split).join(' '),words.slice(split).join(' ')];
}
// Shape complete text and render independent, closed glyph outlines without system fonts.
export function outlineGatePassText(svg){
 return svg.replace(/<text\b([^>]*)>([^<]*)<\/text>/g,(_match,attributes,encoded)=>{
  const attr=name=>attributes.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1];
  const font=Number(attr('font-weight')||400)>=600?bold:regular;
  const run=font.layout(decode(encoded)),requestedSize=Number(attr('font-size')||22);
  const advance=run.positions.reduce((sum,position)=>sum+position.xAdvance,0);
  const availableWidth=Number(attr('data-max-width'))||Infinity;
  const scale=Math.min(requestedSize/font.unitsPerEm,availableWidth/(advance||1));
  const anchor=attr('text-anchor'),width=advance*scale;
  let x=Number(attr('x')||0)-(anchor==='middle'?width/2:anchor==='end'?width:0);
  const y=Number(attr('y')||0);
  return run.glyphs.map((glyph,index)=>{
   const position=run.positions[index];
   const result='<path d="'+glyph.path.toSVG()+'" transform="translate('+(x+position.xOffset*scale)+' '+(y-position.yOffset*scale)+') scale('+scale+' '+(-scale)+')" fill="'+(attr('fill')||'#111111')+'"/>';
   x+=position.xAdvance*scale;return result;
  }).join('');
 });
}
