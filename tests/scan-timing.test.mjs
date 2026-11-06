import test from 'node:test';import assert from 'node:assert/strict';import {scanTimingMessage} from '../lib/scan-timing.mjs';
test('scan confirms first in, last out, or ignored duplicate without inventing an exit',()=>{
 assert.match(scanTimingMessage({markedPresent:true,timingUpdated:true,firstIn:'2026-11-06T10:00:00Z'}),/First in recorded at 15:30:00/);
 assert.match(scanTimingMessage({markedPresent:true,timingUpdated:true,firstIn:'2026-11-06T10:00:00Z',lastOut:'2026-11-06T11:30:00Z'}),/Last out recorded at 17:00:00/);
 assert.match(scanTimingMessage({markedPresent:true,timingUpdated:false}),/Repeat scan ignored/);
 assert.equal(scanTimingMessage({markedPresent:false}),'');
});
