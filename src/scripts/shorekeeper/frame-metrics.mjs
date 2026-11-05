/** Bounded rolling CPU/interval telemetry; never substitutes for GPU timing. */
export function createFrameMetrics(capacity=512) {
 const intervals=new Float64Array(capacity),cpu=new Float64Array(capacity);let count=0;
 const percentiles=values=>{
  const sorted=Array.from(values.subarray(0,Math.min(count,capacity))).sort((a,b)=>a-b);
  const at=p=>sorted.length?sorted[Math.ceil(p*sorted.length)-1]:null;
  return {p50:at(.5),p95:at(.95),p99:at(.99)};
 };
 return {
  add(intervalMs,cpuMs){if(!Number.isFinite(intervalMs)||intervalMs<=0||!Number.isFinite(cpuMs)||cpuMs<0)throw Error('Invalid frame sample');const i=count++%capacity;intervals[i]=intervalMs;cpu[i]=cpuMs;},
  reset(){count=0;},
  report(){return {sampleCount:Math.min(count,capacity),totalSamples:count,windowCapacity:capacity,intervalMs:percentiles(intervals),cpuMs:percentiles(cpu),gpuMs:'NOT_MEASURED'};}
 };
}
