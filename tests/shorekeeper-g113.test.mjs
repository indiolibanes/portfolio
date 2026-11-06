import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {buildR61Plan,R61_SOURCE_IDS} from '../public/experimentos/sk-g9/runtime/r61-plan.mjs';
import {createS3Score,resolveClipId,ambientButterflyGate} from '../public/experimentos/sk-g9/runtime/combat-vfx-events.mjs';
import {createLiberationLayer,liberationColorScore,LIBERATION_RADIUS_PRESETS} from '../public/experimentos/sk-g9/runtime/combat-vfx-liberation.mjs';
import {createTrailLayer,buildTrailHistory,TRAIL_POINTS,TRAIL_WINDOW_S,TRAIL_SEGMENTS,ORBIT_RIBBONS,ORBIT_WINDOW_S} from '../public/experimentos/sk-g9/runtime/combat-vfx-trails.mjs';
import {FLIGHT,SPAWN_STEP} from '../public/experimentos/sk-g9/runtime/combat-vfx-skill.mjs';
import {createS3CombatVfx,COMBAT_VFX_MAX_DRAW_CALLS} from '../public/experimentos/sk-g9/runtime/combat-vfx-adapter.mjs';
const DUR={SK_ATTACK_01_ORIGINAL:3.633,SK_ATTACK_02_ORIGINAL:5.733,SK_ATTACK_03_ORIGINAL:3.867,SK_ATTACK_L02_ORIGINAL:4.667,SK_SKILL_01_ORIGINAL:5.233,SK_BURST_02_ORIGINAL:5.433,SK_IDLE_01_ORIGINAL:2.5};
const lib=()=>R61_SOURCE_IDS.map(id=>new T.AnimationClip(id,DUR[id],[new T.VectorKeyframeTrack('Bip001.position',[0,DUR[id]],[0,0,0,0,0,0])]));
const plan=buildR61Plan(lib(),{bodyStability:'off'}),bundle=createS3Score(plan.schedule),g=bundle.timeline.g11;
function bodyRig(){const root=new T.Group(),b={};for(const n of ['Bip001Pelvis','Bip001Spine2','Bip001RFoot','Bip001LFoot','Bip001RHand','Bip001LHand','Bip001RForearm','Bip001LForearm','Bip001Head','Bip001RThigh','Bip001LThigh']){const o=new T.Bone();o.name=n;root.add(o);b[n]=o;}return {root,b};}
const h=1.6,S=TRAIL_SEGMENTS+1;

test('G11.3 trails: wider and longer than G11.2 (0.058h / 0.64s), orbital ribbons exist',()=>{
 const {root,b}=bodyRig(),hist=buildTrailHistory(root,t=>{for(const o of Object.values(b))o.position.set(t*2*h,1,0);},4);
 const layer=createTrailLayer(T,{parent:new T.Group(),h});
 assert.ok(layer.mesh.material.uniforms.uW.value>=0.12*h,'ribbon width >= 0.12 h (G11.2 0.058 h)');assert.ok(TRAIL_WINDOW_S>=1.0&&TRAIL_WINDOW_S>0.64*1.5,'window >= 1 s');
 assert.ok(ORBIT_RIBBONS>=4&&ORBIT_WINDOW_S>=1.2);assert.ok(S>=40,'smoother ribbons');
 const p=layer.update(hist,2,false,1,1.5);assert.equal(p.ribbons,TRAIL_POINTS.length+ORBIT_RIBBONS);layer.dispose();
});
test('G11.3 orbital beams: energy-driven, circle the chest, widen with the ultimate, pure function of time',()=>{
 const {root,b}=bodyRig(),hist=buildTrailHistory(root,t=>{for(const o of Object.values(b))o.position.set(0,1,0);b.Bip001Spine2.position.set(0,1.3,0);},6); // standing still: only orbit ribbons can show
 const layer=createTrailLayer(T,{parent:new T.Group(),h}),A=layer.mesh.geometry.attributes.aA.array,pos=layer.mesh.geometry.attributes.position.array;
 const rAlpha=r=>Math.max(...Array.from({length:S*2},(_,i)=>A[r*S*2+i]));const R0=TRAIL_POINTS.length;
 assert.equal(layer.update(hist,3,false,0,1),null,'no energy, standing still: nothing');
 assert.ok(layer.update(hist,3,false,1,1)?.strength>0.3,'energy shows orbital beams');for(let j=0;j<ORBIT_RIBBONS;j++)assert.ok(rAlpha(R0+j)>0.3,'orbit ribbon '+j);
 for(let r=0;r<R0;r++)assert.equal(rAlpha(r),0,'body ribbons stay off when still');
 const radius=(r,wide)=>{layer.update(hist,3,false,1,wide);let m=0;for(let s=0;s<S;s++){const o=((r*S+s)*2)*3;m=Math.max(m,Math.hypot(pos[o],pos[o+2]));}return m;};
 assert.ok(radius(R0,1.9)>radius(R0,1)*1.3,'ultimate widens the orbit');assert.ok(radius(R0,1)>0.3*h,'orbit radius is a large fraction of her height');
 layer.update(hist,3,false,1,1.4);const a1=Array.from(pos);layer.update(hist,1.2,false,1,1.4);layer.update(hist,3,false,1,1.4);assert.deepEqual(Array.from(pos),a1,'pure function of time (seek order)');
 assert.equal(layer.update(hist,3,true,1,1),null,'reduced motion hides');layer.dispose();
});
test('G11.3 Skill butterflies: Swift-like flight (>= 2.5x faster than G11.2: 0.59 s)',()=>{
 assert.ok(FLIGHT<=0.25&&0.59/FLIGHT>=2.5,'flight '+FLIGHT);assert.ok(SPAWN_STEP<=0.05,'salvo is a tight burst');
});
test('G11.3 no independent butterflies: ambient flock gated off for the whole score, pure; null gate keeps the legacy value',()=>{
 for(let t=0;t<=plan.schedule.duration;t+=0.25)assert.equal(ambientButterflyGate(g,t),0,'t='+t);
 assert.equal(ambientButterflyGate(null,3),1);
});
test('G11.3 Stellarealm: larger than G11.2 (7.2) and accepted by the layer',()=>{
 assert.ok(LIBERATION_RADIUS_PRESETS.vast>=8.4);const L=createLiberationLayer(T,{parent:new T.Group(),h,bundle});L.dispose();
});
test('G11.3 final butterfly is blue + white only (no gold dominance), huge',()=>{
 const L=createLiberationLayer(T,{parent:new T.Group(),h,bundle}),t=g.butterflyPeak;
 const cue=bundle.score.cueAt(t,resolveClipId(plan.schedule,t),16/9);
 L.update({t,cue,rm:false,bundle,headW:new T.Vector3(0,1.5,0),P:{chest:new T.Vector3(0,1.1,0),rh:new T.Vector3(-.5,1.1,.1),lh:new T.Vector3(.5,1.1,.1)},stage:{x:0,z:0,floorY:0}});
 const u=L.uniformsProbe().butterfly;assert.equal(u.visible,true);
 for(const k of ['uGold','uBlue','uViolet','uHotC']){const c=u[k];assert.ok(c[2]>=c[0]&&c[2]>=c[1]-1e-9,k+' is blue/white (b >= r,g): '+c);assert.ok(c[0]<=c[1]+1e-9,k+' not warm: '+c);}
 assert.ok(u.uMin>=2.4*h-1e-9&&u.uScale>=1.4*0.99,'huge: min half-size '+u.uMin+' (>=2.4 model heights), scale '+u.uScale);L.dispose();
});
function adapterRig(){const {root,b}=bodyRig(),scene=new T.Scene();scene.add(root);
 const pose=t=>{b.Bip001Pelvis.position.set(0,1,0);b.Bip001Spine2.position.set(0,1.3,0);b.Bip001Head.position.set(0,1.6,0);b.Bip001RFoot.position.set(.1,.05,0);b.Bip001LFoot.position.set(-.1,.05,0);b.Bip001RThigh.position.set(.1,.9,0);b.Bip001LThigh.position.set(-.1,.9,0);
  b.Bip001RHand.position.set(.4+.3*Math.sin(t*9),1.2+.2*Math.cos(t*9),.2);b.Bip001LHand.position.set(-.4-.3*Math.sin(t*9),1.2,.2);b.Bip001RForearm.position.set(.3,1.2,.1);b.Bip001LForearm.position.set(-.3,1.2,.1);root.updateMatrixWorld(true);};
 pose(0);const adapter=createS3CombatVfx(T,{scene,model:root,plan,scale:1.6,stageAnchor:{x:0,z:0,floorY:0}});
 const hist=buildTrailHistory(root,t=>pose(t),plan.schedule.duration);return {adapter,hist,pose};}
test('G11.3 Heavy: a large blue+violet singularity on the target, ahead of her, charged during prep, off outside Heavy; budget; reduced motion',()=>{
 assert.equal(COMBAT_VFX_MAX_DRAW_CALLS,9);const {adapter,hist,pose}=adapterRig();adapter.setTrailHistory(hist);
 const heavy=bundle.events.find(e=>e.channel==='heavyPulse');assert.ok(heavy);
 const th=(heavy.start+heavy.end)/2;pose(th);adapter.apply(th);let s=adapter.uniforms().sing;
 assert.equal(s.visible,true,'singularity visible during Heavy');assert.ok(s.uSize>=0.5*h*2/0.46*0.9||s.uSize>0.5,'large: uSize '+s.uSize);
 assert.ok(s.uTint[2]>s.uTint[0]&&s.uViolet[2]>=s.uViolet[1]&&s.uViolet[0]>s.uTint[0],'blue + violet');
 const c=s.uCenter;assert.ok(Math.hypot(c[0]-0,c[2]-0)>0.5*h,'on a target in front of her, not on her body: '+c);
 let off=0;for(let t=0.2;t<plan.schedule.duration;t+=0.1){pose(t);adapter.apply(t);if(!adapter.uniforms().sing.visible)off++;}assert.ok(off>10,'not permanent');
 for(let t=0;t<=plan.schedule.duration;t+=0.05){pose(t);assert.ok(adapter.apply(t).drawCalls<=COMBAT_VFX_MAX_DRAW_CALLS);}
 const rmA=createS3CombatVfx(T,{scene:new T.Scene(),model:null,plan,scale:1.6,proxyAnchors:true,proxyOrigin:[0,0,0],reducedMotion:true,stageAnchor:{x:0,z:0,floorY:0}});rmA.setTrailHistory(hist);
 for(let t=0;t<=plan.schedule.duration;t+=0.25){const r=rmA.apply(t);assert.ok(!r.trails&&!r.sparks,'rm at '+t);}rmA.dispose();adapter.dispose();
});
test('G11.3 trigger butterfly stays above the LEFT hand (ultimate trigger preserved)',()=>{
 const L=createLiberationLayer(T,{parent:new T.Group(),h,bundle}),t=(g.triggerFull+g.triggerDissolve)/2,cue=bundle.score.cueAt(t,resolveClipId(plan.schedule,t),16/9);
 const p=L.update({t,cue,rm:false,bundle,headW:new T.Vector3(0,1.5,0),P:{chest:new T.Vector3(0,1.1,0),rh:new T.Vector3(-.5,1.1,.1),lh:new T.Vector3(.5,1.1,.1)},stage:{x:0,z:0,floorY:0}});
 const [ax,ay,az]=p.trigger.anchor;assert.ok(ay>1.1&&Math.hypot(ax-.5,az-.1)<0.3*h);L.dispose();
});
