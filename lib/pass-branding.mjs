import sharp from 'sharp';
export function formatPassDate(value){
 const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
 return match?match[3]+' '+match[2]+' '+match[1]:'Not set';
}
export async function logoAccent(logo){
 if(!logo)return '#111111';
 const {data,info}=await sharp(logo).resize(64,64,{fit:'inside'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const bins=new Map();
 for(let i=0;i<data.length;i+=info.channels){
  const [r,g,b,a]=data.subarray(i,i+4);if(a<128||Math.max(r,g,b)-Math.min(r,g,b)<35||Math.max(r,g,b)<45)continue;
  const key=[r,g,b].map(v=>Math.floor(v/32)).join(',');const bucket=bins.get(key)||{count:0,r:0,g:0,b:0};
  bucket.count++;bucket.r+=r;bucket.g+=g;bucket.b+=b;bins.set(key,bucket);
 }
 const selected=[...bins.values()].sort((a,b)=>b.count-a.count)[0];
 if(!selected)return '#111111';
 let rgb=[selected.r,selected.g,selected.b].map(v=>Math.round(v/selected.count));
 const luminance=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 while(luminance(rgb)>.183)rgb=rgb.map(v=>Math.floor(v*.92));
 return '#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
}
