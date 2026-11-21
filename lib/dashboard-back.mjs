// Give state-based workspace screens a real history entry for browser/Android Back.
export function bindDashboardBack(target,onDashboard){
 const key='membershipDashboardBack',marker=Date.now().toString(36)+Math.random().toString(36).slice(2);
 let handled=false;
 target.history.pushState({...target.history.state,[key]:marker},'',target.location.href);
 const pop=()=>{handled=true;onDashboard();};
 target.addEventListener('popstate',pop);
 return()=>{
  target.removeEventListener('popstate',pop);
  // Menu navigation back to Dashboard must also consume the temporary entry.
  if(!handled&&target.history.state?.[key]===marker)target.history.back();
 };
}
