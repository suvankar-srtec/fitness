export function scanTimingMessage(data){
 if(!data.markedPresent)return '';
 const clock=value=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(value));
 if(data.timingUpdated&&data.lastOut)return 'Last out recorded at '+clock(data.lastOut)+' (IST).';
 if(data.timingUpdated&&data.firstIn)return 'First in recorded at '+clock(data.firstIn)+' (IST). Scan again when leaving.';
 return '';
}
