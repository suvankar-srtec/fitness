import {outlineGatePassText} from './gate-pass-font.mjs';
import sharp from 'sharp';
import {QRCodeWriter,BarcodeFormat,EncodeHintType} from '@zxing/library';
import {gatePassPayload,renewalMessage} from './gate-pass.mjs';
import {formatPassDate,logoAccent} from './pass-branding.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const text=(value,x,y,size=24,width=700,weight=400,anchor='middle')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-weight="'+weight+'" text-anchor="'+anchor+'" data-max-width="'+width+'">'+escape(value)+'</text>';
function wrap(value,max=58){const rows=[];let row='';for(const word of String(value||'').split(/\s+/)){if(row.length+word.length+1>max&&row){rows.push(row);row='';}row+=(row?' ':'')+word;}if(row)rows.push(row);return rows;}
export async function renderGatePass(member,token){
 const logo=member.gym_logo?Buffer.from(member.gym_logo.slice(member.gym_logo.indexOf(',')+1),'base64'):null;
 const color=await logoAccent(logo);
 const matrix=new QRCodeWriter().encode(gatePassPayload(member,token),BarcodeFormat.QR_CODE,600,600,new Map([[EncodeHintType.CHARACTER_SET,'UTF-8'],[EncodeHintType.ERROR_CORRECTION,'M']]));
 const width=matrix.getWidth(),height=matrix.getHeight(),pixels=Buffer.alloc(width*height,255);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(matrix.get(x,y))pixels[y*width+x]=0;
 const qr=await sharp(pixels,{raw:{width,height,channels:1}}).png().toBuffer();
 const addressRows=wrap(member.gym_address);
 const address=(addressRows.length>2?[addressRows[0],addressRows.slice(1).join(' ')]:addressRows).map((row,i)=>text(row,400,110+i*26,21,680)).join('');
 const renewal=renewalMessage(member).replace(/\d{4}-\d{2}-\d{2}/g,formatPassDate);
 const website=String(member.gym_website||'').replace(/^https?:\/\//,'').replace(/\/$/,'');
 const svg='<svg width="800" height="1060" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="1060" rx="30" fill="#f5f5f5"/><rect x="18" y="18" width="764" height="1024" rx="24" fill="white" stroke="#dddddd"/><g fill="'+color+'"><circle cx="90" cy="80" r="35" fill="'+color+'"/>'+text((member.gym_name||'G').trim().charAt(0).toUpperCase(),90,93,34,60,700).replace('<text','<text fill="white"')+text(member.gym_name||'Gym',400,77,36,480,700)+address+'<path d="M48 155H752" stroke="#eeeeee"/><circle cx="112" cy="235" r="63" fill="#f0f0f0"/>'+text(member.name.trim().charAt(0).toUpperCase(),112,252,44,90)+text(member.name,205,211,34,340,700,'start')+text(member.public_id,205,250,25,300,400,'start')+text(member.plan,650,207,24,190,700)+text('From: '+formatPassDate(member.valid_from),650,244,21,202)+text('To: '+formatPassDate(member.valid_to),650,275,21,202)+text(member.gym_phone||'',400,955,24,700,700)+text(website,400,987,22,700)+text(renewal,400,1018,19,700)+'</g></svg>';
 const composite=[{input:qr,left:100,top:320}];
 if(member.photo){const picture=await sharp(Buffer.from(member.photo,'base64')).resize(126,126,{fit:'cover'}).composite([{input:Buffer.from('<svg width="126" height="126"><circle cx="63" cy="63" r="63" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer();composite.push({input:picture,left:49,top:172});}
 if(logo){const image=await sharp(logo).resize(70,70,{fit:'contain',background:'#ffffff'}).png().toBuffer();composite.push({input:image,left:55,top:45});}
 return sharp(Buffer.from(outlineGatePassText(svg.replace(/<text(?![^>]*\bfill=)/g,'<text fill="'+color+'"')))).composite(composite).png().toBuffer();
}
