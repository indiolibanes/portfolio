/** Precomputation only. No RAF, Worker, second mixer on the live model, or duplicate GLB bytes. */
export function finishSteps(iterator){let step;do{step=iterator.next();}while(!step.done);return step.value;}
export async function runSteps(iterator,{signal,budgetMs=6,now=()=>performance.now(),yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0)),onProgress=()=>{}}={}){
 let maxSliceMs=0,slices=0,workMs=0,units=0,maxUnitMs=0;const phases={};const start=now();
 const aborted=()=>{if(signal?.aborted)throw new DOMException('Preparation cancelled','AbortError');};
 try{while(true){aborted();const began=now();let step;
   do{aborted();const unitStart=now();step=iterator.next();const unitMs=now()-unitStart,phase=step.value?.phase??'finalize';maxUnitMs=Math.max(maxUnitMs,unitMs);const row=phases[phase]??={units:0,workMs:0,maxUnitMs:0};row.units++;row.workMs+=unitMs;row.maxUnitMs=Math.max(row.maxUnitMs,unitMs);units++;if(step.done)break;}while(now()-began<budgetMs);
   const elapsed=now()-began;maxSliceMs=Math.max(maxSliceMs,elapsed);workMs+=elapsed;slices++;
   if(step.done){aborted();return {value:step.value,metrics:{wallMs:now()-start,workMs,maxSliceMs,slices,units,maxUnitMs,phases,cached:false}};}
   onProgress({phase:step.value?.phase??'preparing',slices,units});await yieldTask();
 }}finally{iterator.return?.();}
}
