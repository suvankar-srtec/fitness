import {NextResponse} from 'next/server.js';
import {sameRequestOrigin} from './request-origin.mjs';
import {normalizeEmail} from './email-otp.mjs';
import {loginApi} from './login-api.js';
export async function loginRoute(request,getDatabase){
 if(!sameRequestOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403,headers:{'Cache-Control':'no-store'}});
 const body=await request.clone().json();
 if(body.email!==undefined){try{normalizeEmail(body.email);}catch{return NextResponse.json({error:'Enter a valid email address'},{status:400,headers:{'Cache-Control':'no-store'}});}}
 return loginApi(request,getDatabase());
}
