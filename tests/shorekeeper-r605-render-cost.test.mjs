import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdaptiveQuality} from '../src/scripts/shorekeeper/adaptive-quality.mjs';

test('adaptive DPR observes render-only cost; total frame CPU remains a separate metric',()=>{
 const lab=readFileSync(new URL('../src/scripts/shorekeeper-sk-lab.mjs',import.meta.url),'utf8');
 const frame=lab.slice(lab.indexOf('function frame(now)'));
 assert.match(frame,/const renderStart=performance\.now\(\);const drew=stage\.draw\(/);
 assert.match(frame,/const renderCpuMs=Math\.max\(0,performance\.now\(\)-renderStart\)/);
 assert.match(frame,/frameMetrics\.add\(delta,cpuMs\)/);
 assert.match(frame,/stage\.observeFrame\(renderCpuMs,now,/);
 assert.doesNotMatch(frame,/stage\.observeFrame\(cpuMs,now,/);
});

test('CPU-only animation work does not force a resolution downgrade when render cost fits budget',()=>{
 const low=createAdaptiveQuality({enabled:true,window:4,cooldownMs:0});
 const high=createAdaptiveQuality({enabled:true,window:4,cooldownMs:0});
 // Both scenarios have the same expensive non-render update, but only one has costly rendering.
 for(let i=0;i<8;i++){
  low.sample(4,i*50,16.67);
  high.sample(28,i*50,16.67);
 }
 assert.equal(low.state.current,2);
 assert.equal(high.state.current,1.75);
});
