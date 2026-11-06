import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {buildR61Plan,R61_SOURCE_IDS} from '../public/experimentos/sk-g9/runtime/r61-plan.mjs';
import {createS3Score,resolveClipId,ambientButterflyGate} from '../public/experimentos/sk-g9/runtime/combat-vfx-events.mjs';
import {createLiberationLayer,liberationColorScore,LIBERATION_RADIUS_PRESETS} from '../public/experimentos/sk-g9/runtime/combat-vfx-liberation.mjs';
import {createTrailLayer,buildTrailHistory,TRAIL_POINTS,TRAIL_INDEX,TRAIL_WINDOW_S} from '../public/experimentos/sk-g9/runtime/combat-vfx-trails.mjs';
import {buildSparkTable,createSparkLayer,SPARK_MAX,SPARK_LIFE_S} from '../public/experimentos/sk-g9/runtime/combat-vfx-sparkflies.mjs';
import {createS3CombatVfx,COMBAT_VFX_MAX_DRAW_CALLS} from '../public/experimentos/sk-g9/runtime/combat-vfx-adapter.mjs';
const DUR={SK_ATTACK_01_ORIGINAL:3.633,SK_ATTACK_02_ORIGINAL:5.733,SK_ATTACK_03_ORIGINAL:3.867,SK_ATTACK_L02_ORIGINAL:4.667,SK_SKILL_01_ORIGINAL:5.233,SK_BURST_02_ORIGINAL:5.433,SK_IDLE_01_ORIGINAL:2.5};
const lib=()=>R61_SOURCE_IDS.map(id=>new T.AnimationClip(id,DUR[id],[new T.VectorKeyframeTrack('Bip001.position',[0,DUR[id]],[0,0,0,0,0,0])]));
const plan=buildR61Plan(lib(),{bodyStability:'off'}),bundle=createS3Score(plan.schedule),g=bundle.timeline.g11,burst=plan.schedule.segments[5];
const V=(x,y,z)=>new T.Vector3(x,y,z);
function layerFrame(layer,t,rm=false){const cue=bundle.score.cueAt(t,resolveClipId(plan.schedule,t),16/9);
 const p=layer.update({t,cue,rm,bundle,headW:V(0,1.5,0),P:{chest:V(0,1.1,0),rh:V(-.5,1.1,.1),lh:V(.5,1.1,.1)},stage:{x:0,z:0,floorY:0}});return {p,u:JSON.stringify(layer.uniformsProbe()),m:layer.meshes};}

test('G11.1 trigger: ONE butterfly above the (left, raised) hand, before the field colour ramps, dissolving into the Stellarealm',()=>{
 for(const k of ['triggerStart','triggerFull','triggerDissolve','triggerEnd'])assert.ok(Number.isFinite(g[k]),k);
 const order=['triggerStart','triggerFull','triggerDissolve','triggerEnd','violetStart','goldStart','absorbStart','butterflyStart'];for(let i=1;i<order.length;i++)assert.ok(g[order[i]]>g[order[i-1]],order[i]);
 assert.ok(g.triggerStart>=burst.start&&g.triggerEnd<g.violetStart,'trigger sits inside the real Burst02 segment');
 const L=createLiberationLayer(T,{parent:new T.Group(),h:1.6,bundle});
 const f=layerFrame(L,(g.triggerFull+g.triggerDissolve)/2);assert.equal(f.p.trigger.count,1,'exactly one trigger butterfly');assert.equal(f.m.trigger.visible,true);
 const [ax,ay,az]=f.p.trigger.anchor;assert.ok(ay>1.1+0.03*1.6,'above the RAISED (left) hand (hand y=1.1, anchor y='+ay+')');assert.ok(Math.hypot(ax-.5,az-.1)<0.3*1.6,'laterally close to the left hand');
 assert.equal(layerFrame(L,g.triggerStart-0.05).m.trigger.visible,false);assert.equal(layerFrame(L,g.triggerEnd+0.05).m.trigger.visible,false,'it is gone once the field exists');
 const c=t=>liberationColorScore(t,g);assert.ok(c(g.triggerDissolve+0.05).trig.dis>0&&c(g.triggerEnd-0.001).trig.dis>0.95);assert.equal(c(g.triggerFull).trig.a,1);
 L.dispose();
});
test('G11.1 ambient (R5) butterflies are gated off from the trigger until the burst ends, then restored; pure',()=>{
 assert.equal(ambientButterflyGate(g,g.triggerStart-1),1);assert.equal(ambientButterflyGate(g,g.triggerFull),0);assert.equal(ambientButterflyGate(g,(g.absorbStart+g.butterflyPeak)/2),0);
 assert.equal(ambientButterflyGate(g,g.butterflyEnd+1),1);assert.equal(ambientButterflyGate(null,3),1);assert.equal(ambientButterflyGate(g,g.triggerFull),ambientButterflyGate(g,g.triggerFull));
});
test('G11.1 Stellarealm: vast default radius (much larger than the G11 presets)',()=>{
 assert.ok(LIBERATION_RADIUS_PRESETS.vast>=6&&LIBERATION_RADIUS_PRESETS.vast>=1.8*LIBERATION_RADIUS_PRESETS.wide);
 const L=createLiberationLayer(T,{parent:new T.Group(),h:1.6,bundle});assert.equal(layerFrame(L,g.violetFull).p.radiusH,LIBERATION_RADIUS_PRESETS.vast);L.dispose();
});
test('G11.1 causal order: field -> ABSORPTION -> giant butterfly; the absorption is monotonic and complete before the burst',()=>{
 const L=createLiberationLayer(T,{parent:new T.Group(),h:1.6,bundle});
 const mid=(g.absorbStart+g.butterflyStart)/2;assert.equal(layerFrame(L,mid).p.stage,'ABSORPTION');assert.equal(layerFrame(L,g.butterflyPeak).p.stage,'BUTTERFLY_BURST');
 let prev=-1;for(let t=g.absorbStart-0.05;t<=g.butterflyStart;t+=0.03){const a=liberationColorScore(t,g).absorb;assert.ok(a>=prev-1e-9,'absorb monotonic');prev=a;}
 assert.equal(liberationColorScore(g.absorbStart-0.01,g).absorb,0);assert.ok(liberationColorScore(g.butterflyStart,g).absorb>0.999,'absorption complete when the burst starts');
 assert.ok(layerFrame(L,mid).p.absorbCore,'the absorbing glow/core is drawn on the chest');
 assert.equal(layerFrame(L,g.absorbStart-0.2).m.butterfly.visible,false,'no butterfly before the absorption');
 L.dispose();
});
test('G11.1 giant butterfly: bigger and more chaotic than a calm cancel; rm holds it open and calm',()=>{
 const c=t=>liberationColorScore(t,g);assert.ok(c(g.butterflyOpen).bf.scale>=1&&c(g.butterflyEnd-0.01).bf.scale>1.1,'grows over the burst');
 assert.ok(c(g.butterflyOpen).bf.chaos>0.9&&c(g.butterflyOpen).bf.flash>0.05);const rm=liberationColorScore(g.butterflyPeak,g,true).bf;assert.equal(rm.open,1);assert.equal(rm.scale,1);assert.ok(rm.chaos<=0.4);
 const L=createLiberationLayer(T,{parent:new T.Group(),h:1.6,bundle}),grid=[];for(let t=g.triggerStart-0.2;t<=Math.min(plan.schedule.duration,g.butterflyEnd+0.2);t+=0.04)grid.push(+t.toFixed(3));
 const fwd=grid.map(t=>layerFrame(L,t).u),rev=[...grid].reverse().map(t=>layerFrame(L,t).u).reverse();grid.forEach((t,i)=>assert.equal(fwd[i],rev[i],'seek-order difference at '+t));
 assert.equal(layerFrame(L,Math.min(plan.schedule.duration,g.butterflyEnd+0.04)).m.butterfly.visible,false);L.dispose();
});

// ---- trails ----
function bodyRig(){const root=new T.Group(),b={};for(const n of ['Bip001Pelvis','Bip001Spine2','Bip001RFoot','Bip001LFoot','Bip001RHand','Bip001LHand','Bip001RForearm','Bip001LForearm','Bip001Head','Bip001RThigh','Bip001LThigh']){const o=new T.Bone();o.name=n;root.add(o);b[n]=o;}return {root,b};}
test('G11.1 trails: broad ribbons (not thin lines), hands only at attack speed, body at normal speed',()=>{
 assert.deepEqual(TRAIL_POINTS,['pel','chest','rfoot','lfoot','rhand','lhand']);assert.ok(TRAIL_WINDOW_S>=0.5);
 const {root,b}=bodyRig(),h=1.6,speed=2.0*h; // 2.0 model heights / s: body trails, hands not
 const hist=buildTrailHistory(root,t=>{for(const o of Object.values(b))o.position.set(t*speed,1,0);},4);
 const layer=createTrailLayer(T,{parent:new T.Group(),h});assert.ok(layer.mesh.material.uniforms.uW.value>=0.05*h,'ribbon width >= 0.05 h (G11 was 0.012 h)');
 const probe=layer.update(hist,2);assert.ok(probe&&probe.strength>0.5,'body trails visible at 2.0 h/s');
 const S=23,A=layer.mesh.geometry.attributes.aA.array,ribbonAlpha=r=>Math.max(...Array.from({length:S*2},(_,i)=>A[r*S*2+i]));
 assert.ok(ribbonAlpha(TRAIL_INDEX.pel)>0.5&&ribbonAlpha(TRAIL_INDEX.rfoot)>0.5);assert.equal(ribbonAlpha(TRAIL_INDEX.rhand),0,'hand: no trail below attack speed');assert.equal(ribbonAlpha(TRAIL_INDEX.lhand),0);
 const fast=buildTrailHistory(root,t=>{for(const o of Object.values(b))o.position.set(t*6*h,1,0);},4);layer.update(fast,2);assert.ok(ribbonAlpha(TRAIL_INDEX.rhand)>0.9,'hand trails at attack speed');
 layer.update(hist,3);const a1=Array.from(layer.mesh.geometry.attributes.position.array);layer.update(hist,1);layer.update(hist,3);assert.deepEqual(Array.from(layer.mesh.geometry.attributes.position.array),a1,'pure function of time');
 assert.equal(layer.update(hist,2,true),null,'reduced motion hides');layer.dispose();
});

// ---- quick attack butterflies ----
const handOf=id=>bundle.hand?.[id]??'R';
test('G11.1 spark table: deterministic, only inside combo/heavy events, heavy included, bounded life',()=>{
 const A=buildSparkTable(bundle.events,handOf),B=buildSparkTable(bundle.events,handOf);assert.deepEqual(A,B);assert.ok(A.length>=20);
 assert.ok(A.some(s=>s.kind==='basic')&&A.some(s=>s.kind==='heavyPrep')&&A.some(s=>s.kind==='heavyRel'),'combo + Heavy');
 const ev=bundle.events.filter(e=>e.channel==='blueAttack'||e.channel==='heavyPulse'||(e.channel==='blueCore'&&String(e.id).startsWith('HEAVY')));
 for(const s of A)assert.ok(ev.some(e=>s.ts>=e.start&&s.ts<=e.end+1e-9),'spawn outside any attack event at '+s.ts);
 assert.ok(A.every((s,i)=>i===0||s.ts>=A[i-1].ts),'sorted');assert.ok(SPARK_LIFE_S>0.3&&SPARK_LIFE_S<=0.6,'quick');
 assert.equal(buildSparkTable(null).length,0);
 // none of them belongs to the ultimate trigger/burst window (that is the single trigger butterfly)
 assert.ok(A.every(s=>s.ts<g.triggerStart||s.ts>g.butterflyEnd),'quick butterflies never overlap the ultimate');
});
test('G11.1 spark layer: pure function of time, never above SPARK_MAX, hidden when nothing alive / reduced motion / no history',()=>{
 const {root,b}=bodyRig(),hist=buildTrailHistory(root,t=>{for(const o of Object.values(b))o.position.set(Math.sin(t),1+0.2*Math.cos(t),0);},plan.schedule.duration);
 const table=buildSparkTable(bundle.events,handOf),layer=createSparkLayer(T,{parent:new T.Group(),h:1.6}),head=V(0,1.5,0);
 const at=t=>{const p=layer.update({table,hist,t,rm:false,headW:head});return p?{n:p.alive,a:Array.from(layer.geometry.attributes.iPos.array.slice(0,3*p.alive))}:null;};
 const first=table[0],t0=first.ts+0.12,f1=at(t0);assert.ok(f1&&f1.n>=1);at(t0+5);at(t0-3);assert.deepEqual(at(t0),f1,'same time -> same butterflies (seek order independent)');
 assert.equal(at(first.ts-0.5),null,'nothing before the first attack');assert.equal(layer.mesh.visible,false);
 let max=0;for(let t=0;t<=plan.schedule.duration;t+=0.02){const p=at(t);if(p)max=Math.max(max,p.n);}assert.ok(max>=3&&max<=SPARK_MAX,'alive max '+max);
 assert.equal(layer.update({table,hist,t:t0,rm:true,headW:head}),null,'reduced motion hides');assert.equal(layer.update({table,hist:null,t:t0,rm:false,headW:head}),null);layer.dispose();
});

// ---- adapter: mixed spectrum + budget ----
function adapterRig(){const {root,b}=bodyRig(),scene=new T.Scene();scene.add(root);
 const pose=t=>{b.Bip001Pelvis.position.set(0,1,0);b.Bip001Spine2.position.set(0,1.3,0);b.Bip001Head.position.set(0,1.6,0);b.Bip001RFoot.position.set(.1,.05,0);b.Bip001LFoot.position.set(-.1,.05,0);b.Bip001RThigh.position.set(.1,.9,0);b.Bip001LThigh.position.set(-.1,.9,0);
  b.Bip001RHand.position.set(.4+.3*Math.sin(t*9),1.2+.2*Math.cos(t*9),.2);b.Bip001LHand.position.set(-.4-.3*Math.sin(t*9),1.2,.2);b.Bip001RForearm.position.set(.3,1.2,.1);b.Bip001LForearm.position.set(-.3,1.2,.1);root.updateMatrixWorld(true);};
 pose(0);const adapter=createS3CombatVfx(T,{scene,model:root,plan,scale:1.6,stageAnchor:{x:0,z:0,floorY:0}});
 const hist=buildTrailHistory(root,t=>pose(t),plan.schedule.duration);return {adapter,hist,pose,root};}
test('G11.1 adapter: mixed spectrum (violet in combo AND Heavy), quick butterflies from the hands, draw-call budget, reduced-motion',()=>{
 assert.equal(COMBAT_VFX_MAX_DRAW_CALLS,8);
 const {adapter,hist,pose}=adapterRig();adapter.setTrailHistory(hist);
 const env=bundle.events.filter(e=>e.channel==='blueAttack'),heavy=bundle.events.find(e=>e.channel==='heavyPulse');assert.ok(env.length>=3&&heavy);
 const viol=new Set();let sparkSeen=0;
 for(const e of env){const t=(e.start+e.end)/2;pose(t);adapter.apply(t);const u=adapter.uniforms();const arc=u.arcR.visible?u.arcR:u.arcL;if(arc.visible){assert.ok(arc.uViol>=0.3&&arc.uViol<=0.75);viol.add(arc.uViol.toFixed(3));}
  assert.ok(adapter.last.drawCalls<=COMBAT_VFX_MAX_DRAW_CALLS);}
 assert.ok(viol.size>=2,'the combo clips do not share one flat blue/violet ratio: '+[...viol]);
 const th=heavy.start+0.05;pose(th);adapter.apply(th);assert.ok(Math.abs(adapter.uniforms().pulse.uViol-0.62)<1e-9,'Heavy carries the violet share too');
 for(let t=0;t<=plan.schedule.duration;t+=0.05){pose(t);const r=adapter.apply(t);if(r.sparks)sparkSeen=Math.max(sparkSeen,r.sparks.alive);assert.ok(r.drawCalls<=COMBAT_VFX_MAX_DRAW_CALLS,'draw calls '+r.drawCalls+' at '+t);}
 assert.ok(sparkSeen>=3,'quick butterflies appear during the attacks: '+sparkSeen);
 // quick butterflies are NOT drawn in the ultimate window (single trigger butterfly there)
 for(let t=g.triggerStart;t<=g.butterflyEnd;t+=0.1){pose(t);assert.equal(adapter.apply(t).sparks,null,'no quick butterflies at '+t);}
 const rmA=createS3CombatVfx(T,{scene:new T.Scene(),model:null,plan,scale:1.6,proxyAnchors:true,proxyOrigin:[0,0,0],reducedMotion:true,stageAnchor:{x:0,z:0,floorY:0}});rmA.setTrailHistory(hist);
 for(let t=0;t<=plan.schedule.duration;t+=0.25){const r=rmA.apply(t);assert.ok(!r.sparks&&!r.trails,'reduced motion: no sparks/trails at '+t);}
 rmA.dispose();adapter.dispose();
});
