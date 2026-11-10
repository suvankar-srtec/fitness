export function sameRequestOrigin(request){
 const origin=request.headers.get('origin');if(!origin)return true;
 try{const source=new URL(origin),target=new URL(request.url);if(!['http:','https:'].includes(source.protocol))return false;return source.origin===target.origin||source.host===request.headers.get('host')?.toLowerCase();}catch{return false;}
}
