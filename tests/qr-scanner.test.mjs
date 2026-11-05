import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startQrCamera,memberIdFromQr,cameraErrorMessage} from '../lib/qr-scanner.mjs';
test('member QR recognizes raw IDs and JSON, without opening arbitrary URLs',()=>{
 assert.equal(memberIdFromQr(' MEM00001 '),'MEM00001');assert.equal(memberIdFromQr('{"memberId":"MEM00002"}'),'MEM00002');assert.equal(memberIdFromQr('https://example.com'),null);
});
test('camera stops after first QR and ignores repeated frames',async()=>{
 let callback,stops=0,results=[];const stream={getTracks:()=>[{stop:()=>stops++}]};const controls={stop:()=>{}};
 const session=startQrCamera({video:{},getMedia:async c=>{assert.equal(c.video.facingMode.ideal,'environment');assert.equal(c.audio,false);return stream;},loadReader:async()=>({decodeFromStream:async(s,v,cb)=>{callback=cb;return controls;}}),onError:e=>{throw e;},onResult:r=>results.push(r)});
 await session.ready;callback({getText:()=> 'MEM00001'},null,controls);callback({getText:()=> 'MEM00002'},null,controls);assert.deepEqual(results,['MEM00001']);assert.ok(stops>0);
});
test('closing while permission is pending releases the eventual stream',async()=>{
 let resolve,stops=0,decoded=false;const promise=new Promise(r=>resolve=r);
 const session=startQrCamera({video:{},getMedia:()=>promise,loadReader:async()=>({decodeFromStream:async()=>{decoded=true;}}),onResult:()=>{},onError:()=>{}});
 await Promise.resolve();session.stop();resolve({getTracks:()=>[{stop:()=>stops++}]});await session.ready;assert.equal(decoded,false);assert.equal(stops,1);
});
test('denied permission reports an actionable error',async()=>{
 let error;const session=startQrCamera({video:{},getMedia:async()=>{throw {name:'NotAllowedError'};},loadReader:async()=>({}),onError:e=>error=e,onResult:()=>{}});await session.ready;assert.match(cameraErrorMessage(error),/Allow camera/);
});
