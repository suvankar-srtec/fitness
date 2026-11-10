export function videoLink(value){
 if(typeof value!=='string'||value.length>2048)return null;
 let url;try{url=new URL(value.trim());}catch{return null;}
 if(url.protocol!=='https:'||url.username||url.password)return null;
 const host=url.hostname.toLowerCase();let id;
 if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com'].includes(host)){
  id=host==='youtu.be'?url.pathname.slice(1):url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
  return /^[A-Za-z0-9_-]{11}$/.test(id||'')?{url:url.href,kind:'embed',src:'https://www.youtube-nocookie.com/embed/'+id}:null;
 }
 if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
  const match=url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-f0-9]+))?\/?$/);if(!match)return null;
  const hash=match[2]||url.searchParams.get('h');return {url:url.href,kind:'embed',src:'https://player.vimeo.com/video/'+match[1]+(hash?'?h='+encodeURIComponent(hash):'')};
 }
 return {url:url.href,kind:/\.(mp4|webm|mov)$/i.test(url.pathname)?'video':'link',src:url.href};
}
