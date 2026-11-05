import sharp from 'sharp';
export async function normalizeMemberPicture(value) {
 if(value==null||value==='')return null;
 if(typeof value!=='string'||value.length>2900000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value))throw new Error('INVALID_PICTURE');
 const buffer=Buffer.from(value.slice(value.indexOf(',')+1),'base64');
 if(buffer.length>2*1024*1024)throw new Error('INVALID_PICTURE');
 try{return (await sharp(buffer,{limitInputPixels:20000000}).rotate().resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer()).toString('base64');}catch{throw new Error('INVALID_PICTURE');}
}
