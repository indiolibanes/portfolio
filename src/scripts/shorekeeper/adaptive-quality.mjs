/** Opt-in DPR controller driven by measured render cost, never frame interval/pacing. */
export function createAdaptiveQuality({enabled=false,maxDpr=2,minDpr=1,window=60,cooldownMs=6000}={}) {
 if(!Number.isInteger(window)||window<2||!Number.isFinite(maxDpr)||maxDpr<minDpr||minDpr<1||maxDpr>2)throw Error('Invalid adaptive quality options');
 const samples=new Float64Array(window);let index=0,current=maxDpr,high=0,low=0,lastChange=-Infinity,changes=0;
 return {
  sample(costMs,now,budgetMs){
   if(!enabled||!Number.isFinite(costMs)||costMs<0||!Number.isFinite(now)||!(budgetMs>0))return null;
   samples[index++]=costMs/budgetMs;if(index<window)return null;index=0;
   const p95=Array.from(samples).sort((a,b)=>a-b)[Math.ceil(.95*window)-1];
   high=p95>1.1?high+1:0;low=p95<.55?low+1:0;
   if(now-lastChange<cooldownMs)return null;
   const next=high>=2?Math.max(minDpr,current-.25):low>=4?Math.min(maxDpr,current+.25):current;
   if(next===current)return null;current=next;high=low=0;lastChange=now;changes++;return current;
  },
  setCeiling(v){if(!Number.isFinite(v)||v<minDpr||v>2)throw Error('Invalid DPR ceiling');maxDpr=v;current=Math.min(current,maxDpr);index=high=low=0;return current;},
  get state(){return {enabled,current,minDpr,maxDpr,changes,window,cooldownMs,basis:'MEASURED_CPU_OR_TIMER_QUERY_COST',physicalPerformance:'NOT_VALIDATED'};}
 };
}
