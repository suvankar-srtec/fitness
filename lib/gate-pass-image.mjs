import {outlineGatePassText} from './gate-pass-font.mjs';
import sharp from 'sharp';
import {QRCodeWriter,BarcodeFormat,EncodeHintType} from '@zxing/library';
import {gatePassPayload,gatePassStatus,renewalMessage} from './gate-pass.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
function lines(value,max=52){const result=[];let line='';for(const word of String(value||'').split(/\s+/)){if(line.length+word.length+1>max&&line){result.push(line);line='';}line+=(line?' ':'')+word;}if(line)result.push(line);return result;}
function textLines(value,x,y,{size=22,max=52,anchor='middle',weight=400}={}){return lines(value,max).slice(0,3).map((line,index)=>`<text x="${x}" y="${y+index*(size+8)}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}">${escape(line)}</text>`).join('');}

export async function renderGatePass(member,token) {
 const payload=gatePassPayload(member,token);
 const matrix=new QRCodeWriter().encode(payload,BarcodeFormat.QR_CODE,420,420,new Map([[EncodeHintType.CHARACTER_SET,'UTF-8'],[EncodeHintType.ERROR_CORRECTION,'M']]));
 const width=matrix.getWidth(),height=matrix.getHeight();
 const pixels=Buffer.alloc(width*height,255);for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(matrix.get(x,y))pixels[y*width+x]=0;
 const qr=await sharp(pixels,{raw:{width,height,channels:1}}).png().toBuffer();
 const status=gatePassStatus(member);
 const svg=`<svg width="800" height="920" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="1000" rx="30" fill="#f5f5f5"/><rect x="18" y="18" width="764" height="884" rx="24" fill="white" stroke="#dddddd"/><g fill="#111111"><circle cx="90" cy="87" r="35" fill="#111111"/><text x="90" y="100" fill="white" text-anchor="middle" font-size="36">${escape((member.gym_name||'G').trim().charAt(0).toUpperCase())}</text>${textLines(member.gym_name||'Gym',145,79,{size:34,max:29,anchor:'start',weight:700})}<text x="145" y="116" fill="#666666" font-size="20">MEMBER GATE PASS</text><path d="M48 144H752" stroke="#eeeeee"/><circle cx="112" cy="231" r="63" fill="#eeeeee"/><text x="112" y="247" text-anchor="middle" font-size="48">${escape(member.name.trim().charAt(0).toUpperCase())}</text><text x="205" y="210" font-size="36" font-weight="700" data-max-width="330">${escape(member.name)}</text><text x="205" y="251" font-size="25" fill="#666666">${escape(member.public_id)}</text><text x="650" y="210" text-anchor="middle" font-size="29" font-weight="600" data-max-width="200">${escape(member.plan)}</text><rect x="554" y="230" width="192" height="42" rx="21" fill="#111111"/><text x="650" y="259" text-anchor="middle" font-size="23" fill="white">${escape(status)}</text><text x="210" y="332" text-anchor="middle" font-size="21" fill="#666666">VALID FROM</text><text x="590" y="332" text-anchor="middle" font-size="21" fill="#666666">VALID TO</text><text x="210" y="371" text-anchor="middle" font-size="30" font-weight="600">${escape(member.valid_from||'Not set')}</text><text x="590" y="371" text-anchor="middle" font-size="30" font-weight="600">${escape(member.valid_to||'Not set')}</text>${textLines(renewalMessage(member),400,866,{size:22,max:61})}</g></svg>`;
 const composite=[{input:qr,left:190,top:400}];
 if(member.photo){const picture=await sharp(Buffer.from(member.photo,'base64')).resize(126,126,{fit:'cover'}).composite([{input:Buffer.from('<svg width="126" height="126"><circle cx="63" cy="63" r="63" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer();composite.push({input:picture,left:49,top:168});}
 if(member.gym_logo){const logo=await sharp(Buffer.from(member.gym_logo.slice(member.gym_logo.indexOf(',')+1),'base64')).resize(70,70,{fit:'cover'}).composite([{input:Buffer.from('<svg width="70" height="70"><circle cx="35" cy="35" r="35" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer();composite.push({input:logo,left:55,top:52});}
 return sharp(Buffer.from(outlineGatePassText(svg))).composite(composite).png().toBuffer();
}
