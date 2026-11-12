import {outlineGatePassText} from './gate-pass-font.mjs';
import sharp from 'sharp';
import {documentBranding} from './document-branding.mjs';
import {passRolePalette} from './pass-role-palette.mjs';
import {QRCodeWriter,BarcodeFormat,EncodeHintType} from '@zxing/library';
import {gatePassPayload,renewalMessage} from './gate-pass.mjs';
import {formatPassDate,logoAccent} from './pass-branding.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const text=(value,x,y,size=24,width=700,weight=400,anchor='middle')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" font-weight="'+weight+'" text-anchor="'+anchor+'" data-max-width="'+width+'">'+escape(value)+'</text>';
export async function renderGatePass(member,token){
 const logo=member.gym_logo?Buffer.from(member.gym_logo.slice(member.gym_logo.indexOf(',')+1),'base64'):null;
 const color=await logoAccent(logo),palette=passRolePalette(color,'supervisor');
 const matrix=new QRCodeWriter().encode(gatePassPayload(member,token),BarcodeFormat.QR_CODE,720,720,new Map([[EncodeHintType.CHARACTER_SET,'UTF-8'],[EncodeHintType.ERROR_CORRECTION,'H'],[EncodeHintType.QR_VERSION,7]]));
 const width=matrix.getWidth(),height=matrix.getHeight(),pixels=Buffer.alloc(width*height,255);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(matrix.get(x,y))pixels[y*width+x]=0;
 const qr=await sharp(pixels,{raw:{width,height,channels:1}}).png().toBuffer();
 const renewal=renewalMessage(member).replace(/\d{4}-\d{2}-\d{2}/g,formatPassDate);
 const brand=documentBranding({name:member.gym_name,phone:member.gym_phone,email:member.gym_email,website:member.gym_website});
 const svg='<svg width="800" height="1240" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="1240" rx="30" fill="#f5f5f5"/><rect x="18" y="18" width="764" height="1204" rx="24" fill="white" stroke="#dddddd"/><path d="M42 18H758Q782 18 782 42V200H18V42Q18 18 42 18Z" fill="'+palette.background+'"/><g fill="'+color+'">'+text(brand.name,48,65,36,510,700,'start').replace('<text','<text fill="'+palette.foreground+'"')+text('Contact: '+brand.contact,48,103,24,510,400,'start').replace('<text','<text fill="'+palette.foreground+'"')+text('Email: '+brand.email,48,134,22,510,400,'start').replace('<text','<text fill="'+palette.foreground+'"')+'<path d="M48 200H752" stroke="#eeeeee"/><circle cx="680" cy="108" r="76" fill="white" stroke="'+color+'" stroke-width="2"/><circle cx="680" cy="108" r="70" fill="#f3f3f3"/>'+text(member.name.trim().charAt(0).toUpperCase(),680,127,50,130)+text('Name: '+member.name,48,255,32,460,700,'start').replace('<text','<text fill="#111111"')+text('User ID: '+member.public_id,48,298,25,460,400,'start').replace('<text','<text fill="#566173"')+text('Plan: '+member.plan,752,229,22,202,700,'end').replace('<text','<text fill="#111111"')+text('From: '+formatPassDate(member.valid_from),752,267,21,202,400,'end').replace('<text','<text fill="#566173"')+text('To: '+formatPassDate(member.valid_to),752,300,21,202,400,'end').replace('<text','<text fill="#566173"')+text(renewal,400,1132,24,700,700).replace('<text','<text fill="#111111"')+'<path d="M48 1155H752" stroke="#eeeeee"/>'+text('Website: '+brand.website,48,1180,22,700,400,'start').replace('<text','<text fill="#000000"')+'</g></svg>';
 const composite=[{input:qr,left:40,top:375}];
 if(member.photo){const picture=await sharp(Buffer.from(member.photo,'base64')).rotate().resize(132,132,{fit:'cover',position:'north'}).extend({top:6,bottom:6,left:6,right:6,background:'#ffffff'}).composite([{input:Buffer.from('<svg width="144" height="144"><circle cx="72" cy="72" r="72" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer();composite.push({input:picture,left:608,top:36});}
 if(logo){const image=await sharp(logo).resize(82,82,{fit:'contain',background:'#ffffff'}).extend({top:9,bottom:9,left:9,right:9,background:'#ffffff'}).png().toBuffer();composite.push({input:image,left:350,top:685});}
 return sharp(Buffer.from(outlineGatePassText(svg.replace(/<text(?![^>]*\bfill=)/g,'<text fill="'+color+'"')))).composite(composite).png().toBuffer();
}

