// Three gym-logo shades; QR modules always remain black on white.
export function passRolePalette(accent,role){
 const value=/^#[0-9a-f]{6}$/i.test(accent||'')?accent:'#111111';
 const rgb=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
 const mix=(target,ratio)=>'#'+rgb.map(v=>Math.round(v*(1-ratio)+target*ratio).toString(16).padStart(2,'0')).join('');
 if(role==='manager')return {background:mix(0,.28),foreground:'#ffffff',border:mix(0,.28)};
 if(role==='supervisor')return {background:value,foreground:'#ffffff',border:value};
 return {background:mix(255,.88),foreground:mix(0,.28),border:mix(255,.45)};
}

