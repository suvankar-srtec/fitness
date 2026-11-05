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
 const svg=`<svg width="800" height="1180" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="1180" rx="30" fill="#f5f5f5"/><rect x="18" y="18" width="764" height="1144" rx="24" fill="white" stroke="#dddddd"/><g font-family="Arial, sans-serif" fill="#111111"><circle cx="90" cy="87" r="35" fill="#111111"/><text x="90" y="100" fill="white" text-anchor="middle" font-size="34">${escape((member.gym_name||'G').trim().charAt(0).toUpperCase())}</text>${textLines(member.gym_name||'Gym',145,82,{size:25,max:35,anchor:'start',weight:700})}<text x="145" y="113" fill="#666666" font-size="14" letter-spacing="3">MEMBER GATE PASS</text><path d="M48 145H752" stroke="#eeeeee"/><circle cx="400" cy="232" r="63" fill="#eeeeee"/><text x="400" y="247" text-anchor="middle" font-size="44">${escape(member.name.trim().charAt(0).toUpperCase())}</text>${textLines(member.name,400,335,{size:29,max:38,weight:700})}<text x="400" y="405" text-anchor="middle" font-size="18" fill="#666666">${escape(member.public_id)}</text>${textLines(member.plan,400,447,{size:23,max:45,weight:600})}<text x="210" y="485" text-anchor="middle" font-size="15" fill="#666666">VALID FROM</text><text x="590" y="485" text-anchor="middle" font-size="15" fill="#666666">VALID TO</text><text x="210" y="515" text-anchor="middle" font-size="22">${escape(member.valid_from||'Not set')}</text><text x="590" y="515" text-anchor="middle" font-size="22">${escape(member.valid_to||'Not set')}</text><rect x="310" y="544" width="180" height="34" rx="17" fill="#111111"/><text x="400" y="567" text-anchor="middle" font-size="16" fill="white">${escape(status)}</text><text x="400" y="1048" text-anchor="middle" font-size="18">Scan at reception to mark attendance</text>${textLines(renewalMessage(member),400,1090,{size:17,max:66})}</g></svg>`;
 const composite=[{input:qr,left:190,top:604}];
 if(member.photo){const picture=await sharp(Buffer.from(member.photo,'base64')).resize(126,126,{fit:'cover'}).composite([{input:Buffer.from('<svg width="126" height="126"><circle cx="63" cy="63" r="63" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer();composite.push({input:picture,left:337,top:169});}
 if(member.gym_logo){const logo=await sharp(Buffer.from(member.gym_logo.slice(member.gym_logo.indexOf(',')+1),'base64')).resize(70,70,{fit:'cover'}).composite([{input:Buffer.from('<svg width="70" height="70"><circle cx="35" cy="35" r="35" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer();composite.push({input:logo,left:55,top:52});}
 return sharp(Buffer.from(svg)).composite(composite).png().toBuffer();
}
