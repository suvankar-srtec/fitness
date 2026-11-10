import {sameRequestOrigin} from './request-origin.mjs';
﻿import {NextResponse} from 'next/server.js';
import {tokenHash} from './password.mjs';
export async function logoutApi(request,getDatabase){
 const reply=(data,status=200)=>{const response=NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});response.cookies.set('session','',{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});return response;};
 if(request.method!=='POST')return NextResponse.json({error:'Method not allowed'},{status:405});
 if(!sameRequestOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const token=request.cookies?.get('session')?.value;
 if(!token)return reply({ok:true});
 try{
  const sql=getDatabase();
  if(token.startsWith('m.'))await sql`DELETE FROM member_sessions WHERE token_hash=${tokenHash(token)}`;
  else await sql`DELETE FROM sessions WHERE token_hash=${tokenHash(token)}`;
  return reply({ok:true});
 }catch{console.error('Logout session revocation failed');return reply({error:'Session cleanup failed. Please retry.'},503);}
}
