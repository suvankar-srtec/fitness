export function notifyWorkspaceChange(){
 if(typeof window==='undefined')return;
 window.dispatchEvent(new Event('gym-data-changed'));
 if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('gym-data-updates');channel.postMessage({type:'changed'});channel.close();}
}
