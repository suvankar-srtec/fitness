// Pure palette extraction shared by every gym role. Ignore transparent and
// neutral logo backgrounds so a white background does not hide the brand hue.
export function contrastRatio(a,b){
 const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function gymPalette(pixels){
 const bins=new Map();
 for(let i=0;i+3<pixels.length;i+=4){const [r,g,b,a]=pixels.slice(i,i+4);if(a<128||Math.max(r,g,b)-Math.min(r,g,b)<30||Math.max(r,g,b)<40)continue;const key=[r>>5,g>>5,b>>5].join(',');const bin=bins.get(key)||{rgb:[0,0,0],count:0};bin.rgb=bin.rgb.map((v,j)=>v+[r,g,b][j]);bin.count++;bins.set(key,bin);}
 const best=[...bins.values()].sort((a,b)=>b.count-a.count)[0];let rgb=best?best.rgb.map(v=>Math.round(v/best.count)):[17,17,17];
 // Ensure white labels and brand text on white both meet WCAG AA.
 while(contrastRatio(rgb,[255,255,255])<4.5)rgb=rgb.map(v=>Math.floor(v*.94));
 const hex=values=>'#'+values.map(v=>v.toString(16).padStart(2,'0')).join('');
 return {accent:hex(rgb),hover:hex(rgb.map(v=>Math.round(v*.8))),soft:hex(rgb.map(v=>Math.round(v*.08+255*.92))),background:hex(rgb.map(v=>Math.round(v*.025+255*.975))),border:hex(rgb.map(v=>Math.round(v*.18+255*.82)))};
}
