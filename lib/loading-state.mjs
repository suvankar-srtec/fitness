let pending=0;
const emit=()=>{if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function')window.dispatchEvent(new CustomEvent('membership-loading',{detail:pending}));};
export function beginLoading(){if(typeof window==='undefined')return ()=>{};pending++;emit();let ended=false;return ()=>{if(ended)return;ended=true;pending=Math.max(0,pending-1);emit();};}
export const pendingLoading=()=>pending;
