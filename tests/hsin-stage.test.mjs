import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {HSIN_STAGE,pixelRatio,cameraFit,attentionHeight} from '../src/scripts/hsin-stage-config.mjs';
import {createStageLoop} from '../src/scripts/hsin-stage-loop.mjs';
import {createBakedPose,createBakedChest} from '../src/scripts/hsin-baked-pose.mjs';

// Hardware budget and view framing, including a narrow portrait viewport.
for(const [w,h,dpr,touch]of [[393,800,3,true],[1920,1080,2,false],[320,1100,4,true]]){
 const ratio=pixelRatio(w,h,dpr,touch);assert.ok(w*h*ratio*ratio<=HSIN_STAGE.maxPixels+.01);assert.ok(ratio<dpr);
}
const bounds={min:[-.5,0,-.4],max:[.5,1.75,.4]};assert.ok(cameraFit(bounds,.3)>cameraFit(bounds,1));
assert.equal(attentionHeight(5,5),HSIN_STAGE.baseTargetY);assert.ok(Math.abs(attentionHeight(HSIN_STAGE.minDistance,5)-1.39)<1e-10);

// A display running at 120 Hz may not render the animated stage at 120 FPS.
let pending=new Map(),id=0,draws=0,steps=0,clock=0,animate=true,moving=false;
const loop=createStageLoop({requestFrame:f=>{pending.set(++id,f);return id;},cancelFrame:i=>pending.delete(i),active:()=>animate,step:dt=>{steps++;clock+=dt;},draw:()=>draws++,controlsUpdate:()=>moving,fps:30});
const tick=now=>{const tasks=[...pending.values()];pending.clear();tasks.forEach(f=>f(now));};
loop.invalidate();for(let t=0;t<=1000;t+=1000/120)tick(t);
assert.ok(draws<=31&&draws>=29,`render budget: ${draws}`);assert.ok(clock>.9&&clock<1.02);
loop.setVisible(false);assert.equal(pending.size,0);const saved=clock;tick(100000);assert.equal(clock,saved,'hidden time is not accumulated');
loop.setVisible(true);tick(100000);assert.equal(clock,saved,'resume begins with zero dt');
animate=false;loop.policyChanged();tick(100050);assert.equal(pending.size,0,'paused stage is demand-only');const frozen=steps;loop.invalidate();tick(100100);assert.equal(steps,frozen);assert.equal(pending.size,0);
moving=true;loop.invalidate();tick(100150);assert.ok(pending.size>0,'user damping may continue while acting is paused');moving=false;tick(100200);assert.equal(pending.size,0);loop.dispose();loop.invalidate();assert.equal(pending.size,0);

// Baked actors restore exactly and work with static local matrices.
const names=Array.from({length:6},(_,i)=>'joint'+i),bones=names.map(name=>Object.assign(new THREE.Bone(),{name}));
const rest=bones.flatMap(b=>b.quaternion.toArray()),end=bones.flatMap(()=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.4).toArray());
const data={names,rest,frames:[rest,end]},pose=createBakedPose({THREE,data,bones});assert.equal(pose.diagnostics().ready,true);pose.apply(1);assert.ok(!pose.atBaseline());pose.restore();assert.deepEqual(bones.flatMap(b=>b.quaternion.toArray()),rest);
const chest=createBakedChest({THREE,profile:{chest:data,composition:data},bones});assert.equal(chest.select('composed'),true);chest.apply(.5);chest.restore();assert.ok(chest.atBaseline());

const page=await readFile(new URL('../src/pages/experimentos/hsin/index.astro',import.meta.url),'utf8'),runtime=await readFile(new URL('../src/scripts/hsin-stage.ts',import.meta.url),'utf8'),headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
assert.ok(!page.includes('type="file"'));assert.ok(!page.includes('data-hsin-laboratory'));assert.ok(page.includes('data-stage-in')&&page.includes('data-stage-out')&&page.includes('data-stage-reset'));
for(const forbidden of ['hsin-local-lab','createChestPose','createHairPose','calibratePupils','auditFacialMorphs','createSleeveIntersectionAudit','Rapier','EffectComposer'])assert.ok(!runtime.includes(forbidden),forbidden+' must not be part of the public player');
assert.ok(runtime.includes('preserveDrawingBuffer:false'));assert.ok(runtime.includes('shadowMap.enabled=false'));assert.ok(runtime.includes('AbortController'));assert.ok(runtime.includes('body?.dispose()'));assert.ok(runtime.includes('t.image?.close?.()'));
assert.ok(headers.includes('/experimentos/hsin/*'));assert.ok(headers.includes("img-src 'self' data: blob:"));
console.log('Hsin V2 stage: 30 FPS cap, hidden/reduced/paused clock, demand-only camera damping, camera and pixel budgets, exact baked restoration, no upload/authoring runtime PASS');
