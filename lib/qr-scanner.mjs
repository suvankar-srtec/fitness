export function cameraErrorMessage(error) {
  if(error?.name==='NotAllowedError'||error?.name==='SecurityError')return 'Allow camera access in your browser settings, then retry.';
  if(error?.name==='NotFoundError')return 'No camera found.';
  if(error?.name==='NotReadableError')return 'Camera is in use. Close other camera apps and retry.';
  return 'Unable to open camera. Please retry.';
}

export function memberIdFromQr(text) {
  let value=text.trim();
  try {const data=JSON.parse(value);if(typeof data?.memberId==='string')value=data.memberId.trim();}catch{}
  if(/^MEM\d{5,}$/.test(value))return value;
  return /^mem\d{2,}$/i.test(value)?'mem'+String(Number(value.slice(3))).padStart(2,'0'):null;
}

// Own the stream so stopping also works during permission and decoder startup.
export function startQrCamera({video,onResult,onError,onReady,getMedia,loadReader}) {
  let stopped=false,stream,controls;
  const stop=()=>{stopped=true;controls?.stop();stream?.getTracks().forEach(track=>track.stop());if(video.srcObject===stream)video.srcObject=null;};
  const ready=(async()=>{
    try {
      const reader=await loadReader();
      if(stopped)return;
      try{stream=await getMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});}
      catch(error){if(stopped)return;if(!['OverconstrainedError','NotFoundError'].includes(error?.name))throw error;stream=await getMedia({audio:false,video:true});}
      if(stopped){stream.getTracks().forEach(track=>track.stop());return;}
      controls=await reader.decodeFromStream(stream,video,(result,_error,callbackControls)=>{
        if(!result||stopped)return;
        callbackControls?.stop();stop();onResult(result.getText());
      });
      if(stopped){controls.stop();return;}
      onReady?.();
    }catch(error){if(stopped)return;stop();onError(error);}
  })();
  return {stop,ready};
}
