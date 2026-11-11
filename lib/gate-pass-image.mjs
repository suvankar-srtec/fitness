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
 const color=await logoAccent(logo),palette=passRolePalette(color,'member');
 const matrix=new QRCodeWriter().encode(gatePassPayload(member,token),BarcodeFormat.QR_CODE,720,720,new Map([[EncodeHintType.CHARACTER_SET,'UTF-8'],[EncodeHintType.ERROR_CORRECTION,'M']]));
 const width=matrix.getWidth(),height=matrix.getHeight(),pixels=Buffer.alloc(width*height,255);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(matrix.get(x,y))pixels[y*width+x]=0;
 const qr=await sharp(pixels,{raw:{width,height,channels:1}}).png().toBuffer();
 const renewal=renewalMessage(member).replace(/\d{4}-\d{2}-\d{2}/g,formatPassDate);
 const brand=documentBranding({name:member.gym_name,phone:member.gym_phone,email:member.gym_email,website:member.gym_website});
 const svg='<svg width="800" height="1240" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="1240" rx="30" fill="#f5f5f5"/><rect x="18" y="18" width="764" height="1204" rx="24" fill="white" stroke="#dddddd"/><path d="M42 18H758Q782 18 782 42V155H18V42Q18 18 42 18Z" fill="'+palette.background+'"/><g fill="'+color+'"><circle cx="710" cy="80" r="35" fill="'+color+'"/>'+text((member.gym_name||'G').trim().charAt(0).toUpperCase(),710,93,34,60,700).replace('<text','<text fill="white"')+text('Gym: '+brand.name,48,65,36,585,700,'start')+text('Contact: '+brand.contact,48,103,24,585,400,'start')+text('Email: '+brand.email,48,134,22,585,400,'start')+'<path d="M48 155H752" stroke="#eeeeee"/><circle cx="149" cy="270" r="96" fill="white" stroke="'+color+'" stroke-width="2"/><circle cx="149" cy="270" r="88" fill="#f3f3f3"/>'+text(member.name.trim().charAt(0).toUpperCase(),149,291,56,140)+text('Name: '+member.name,267,245,30,270,700,'start')+text('User ID: '+member.public_id,267,286,23,270,400,'start')+text('Plan: '+member.plan,650,229,22,190,700)+text('From: '+formatPassDate(member.valid_from),650,267,21,202)+text('To: '+formatPassDate(member.valid_to),650,300,21,202)+text(renewal,400,350,18,700)+text('Email: '+brand.email,48,1140,22,700,400,'start')+text('Website: '+brand.website,48,1180,22,700,400,'start')+'</g></svg>';
 const composite=[{input:qr,left:40,top:375}];
 if(member.photo){const picture=await sharp(Buffer.from(member.photo,'base64')).rotate().resize(172,172,{fit:'cover',position:'north'}).extend({top:6,bottom:6,left:6,right:6,background:'#ffffff'}).composite([{input:Buffer.from('<svg width="184" height="184"><circle cx="92" cy="92" r="92" fill="white"/></svg>'),blend:'dest-in'}]).png().toBuffer();composite.push({input:picture,left:57,top:178});}
 if(logo){const image=await sharp(logo).resize(70,70,{fit:'contain',background:'#ffffff'}).png().toBuffer();composite.push({input:image,left:675,top:45});}
 return sharp(Buffer.from(outlineGatePassText(svg.replace(/<text(?![^>]*\bfill=)/g,'<text fill="'+color+'"')))).composite(composite).png().toBuffer();
}
