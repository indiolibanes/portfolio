/** Optional, bounded WebGL2 timer queries. No RAF, blocking wait or GPU approval claim. */
export function createGpuTimer(gl,{enabled=false,capacity=120,maxPending=4}={}) {
 const extension=enabled?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;
 const samples=new Float64Array(capacity);let count=0,active=null,disposed=false,discarded=0,latestMs=null;
 const pending=[];
 const destroy=q=>{if(!gl.isContextLost())gl.deleteQuery(q);};
 function reset(){if(active){if(!gl.isContextLost())gl.endQuery(extension.TIME_ELAPSED_EXT);destroy(active);active=null;}for(const q of pending)destroy(q);pending.length=0;count=0;latestMs=null;}
 function poll(){
  if(!extension||disposed||gl.isContextLost())return;
  if(gl.getParameter(extension.GPU_DISJOINT_EXT)){discarded+=pending.length;reset();return;}
  while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
   const q=pending.shift(),ns=gl.getQueryParameter(q,gl.QUERY_RESULT);destroy(q);
   if(Number.isFinite(ns)&&ns>=0){latestMs=ns/1e6;samples[count++%capacity]=latestMs;}
  }
 }
 return {
  begin(){poll();if(!extension||disposed||active||gl.isContextLost()||pending.length>=maxPending)return false;active=gl.createQuery();if(!active)return false;gl.beginQuery(extension.TIME_ELAPSED_EXT,active);return true;},
  end(){if(!active)return;if(!gl.isContextLost()){gl.endQuery(extension.TIME_ELAPSED_EXT);pending.push(active);}active=null;},
  poll,reset,
  get latestMs(){poll();return latestMs;},
  report(){poll();const n=Math.min(count,capacity),s=Array.from(samples.subarray(0,n)).sort((a,b)=>a-b),p=q=>n?s[Math.ceil(n*q)-1]:null;
   return {status:!enabled?'DISABLED':!extension?'GPU_NOT_MEASURED_UNSUPPORTED':n?'TIMER_QUERY_AVAILABLE':'GPU_NOT_MEASURED_PENDING',timerQueryMs:{p50:p(.5),p95:p(.95),p99:p(.99)},samples:n,pending:pending.length,discarded,physicalGpuValidation:'NOT_VALIDATED'};},
  dispose(){if(disposed)return;reset();disposed=true;}
 };
}
