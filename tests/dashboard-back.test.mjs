import test from 'node:test';
import assert from 'node:assert/strict';
import {bindDashboardBack} from '../lib/dashboard-back.mjs';
function browser(){
 const target=new EventTarget(),entries=[{state:{preserved:'original'}}];let index=0;
 target.location={href:'https://app.test/'};
 target.history={get state(){return entries[index].state;},pushState(state,_title,url){assert.equal(url,target.location.href);entries.splice(++index);entries.push({state});},back(){if(index){index--;queueMicrotask(()=>target.dispatchEvent(new Event('popstate')));}}};
 return {target,depth:()=>index};
}
test('phone/browser Back returns to dashboard and preserves existing history state',async()=>{
 const b=browser();let returned=0;const dispose=bindDashboardBack(b.target,()=>returned++);
 assert.equal(b.depth(),1);assert.equal(b.target.history.state.preserved,'original');
 b.target.history.back();await Promise.resolve();assert.equal(returned,1);assert.equal(b.depth(),0);
 dispose();assert.equal(b.depth(),0);assert.deepEqual(b.target.history.state,{preserved:'original'});
});
test('dashboard button removes the temporary entry without triggering another navigation',async()=>{
 const b=browser();let returned=0;const dispose=bindDashboardBack(b.target,()=>returned++);
 dispose();await Promise.resolve();assert.equal(returned,0);assert.equal(b.depth(),0);
});
test('leaving a screen does not consume an unrelated newer history entry',async()=>{
 const b=browser();let returned=0;const dispose=bindDashboardBack(b.target,()=>returned++);
 b.target.history.pushState({other:true},'',b.target.location.href);dispose();await Promise.resolve();
 assert.equal(b.depth(),2);assert.deepEqual(b.target.history.state,{other:true});assert.equal(returned,0);
});
