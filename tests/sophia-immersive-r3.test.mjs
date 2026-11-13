import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {R3,sampleImmersiveR3At as sample,gripStepAt,startWipeScale} from '../src/scripts/sophia-immersive-r3-timeline.mjs';
import {ActiveSceneClock} from '../src/scripts/sophia-launch-timeline.mjs';

test('R3 ignition precedes countdown; five real intervals and zero releases the vehicle',()=>{
 assert.ok(sample(1.9).enginePower>0);assert.equal(sample(1.9).countdownDigit,null);
 for(let i=0;i<5;i++){assert.equal(sample(R3.countdown+i).countdownDigit,5-i);assert.equal(sample(R3.countdown+i+.999).countdownDigit,5-i);}
 assert.equal(sample(R3.launch).countdownDigit,0);assert.equal(sample(R3.launch+.32).countdownDigit,null);
 for(const t of [0,2,6,R3.launch]){assert.equal(sample(t).height,0);assert.equal(sample(t).pitch,0);}
 assert.ok(sample(R3.launch+.5).height>0);assert.equal(sample(R3.orbitEnd).orbitTheta,Math.PI);
});
test('orbit is monotonic while rising, with at least one stationary grip per handover',()=>{
 let theta=-1,height=-1;for(let i=0;i<=160;i++){const s=sample(R3.launch+i/100);assert.ok(s.orbitTheta>=theta&&s.height>=height);theta=s.orbitTheta;height=s.height;const l=gripStepAt(s.orbit,'L'),r=gripStepAt(s.orbit,'R');assert.ok(l.holding||r.holding);}
 for(const p of [.1,.3,.7,.9]){const e=.000001,l=gripStepAt(p,'L'),r=gripStepAt(p,'R');if(l.holding)assert.ok(Math.abs(gripStepAt(p+e,'L').angle-l.angle)<1e-9);if(r.holding)assert.ok(Math.abs(gripStepAt(p+e,'R').angle-r.angle)<1e-9);}
});
test('lift and left-flight position/velocity are continuous and seek order independent',()=>{
 for(const boundary of [R3.launch,R3.pitchStart,R3.flight]){const e=1e-5,a=sample(boundary-e),b=sample(boundary),c=sample(boundary+e);for(const k of ['height','x']){assert.ok(Math.abs(a[k]-b[k])<1e-3);assert.ok(Math.abs((b[k]-a[k])/e-(c[k]-b[k])/e)<1e-3);}}
 assert.ok(sample(15).x<sample(12).x);const expected=sample(8.4);sample(20);sample(0);assert.deepEqual(sample(8.4),expected);
});
test('wipe covers portrait/ultrawide and active clock resumes without hidden catch-up',()=>{
 for(const [w,h] of [[390,640],[2560,1080],[320,900]])assert.ok(startWipeScale(240,80,w,h)*80>Math.hypot(w,h));
 const c=new ActiveSceneClock();c.start(0);c.pause('hidden',3000);assert.equal(c.read(20000),3);c.resume('hidden',20000);assert.equal(c.read(21000),4);
});
test('root route replaces legacy test page, keeps menu and scopes GLB CSP',async()=>{
 const page=await readFile('src/pages/modo-imersivo.astro','utf8'),headers=await readFile('public/_headers','utf8');assert.match(page,/<ExperimentalMenu \/>/);
 await assert.rejects(stat('src/pages/modo-experimental.astro'),{code:'ENOENT'});await assert.rejects(stat('src/pages/experimentos/modo-imersivo.astro'),{code:'ENOENT'});
 assert.match(headers,/\/modo-imersivo\*[\s\S]*?img-src 'self' data: blob:/);
 assert.match(await readFile('public/_redirects','utf8'),/\/experimentos\/modo-imersivo \/modo-imersivo 301/);
});
