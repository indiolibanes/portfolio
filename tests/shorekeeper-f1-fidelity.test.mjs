import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {BURST_ORIGINAL_IDS} from '../src/scripts/shorekeeper/liberation-rotation.mjs';
import {PROFILE_ARTISTIC,PROFILE_FIDELITY,FIDELITY_STATUS,resolveProfile,bodyLayerRoot,applyFidelityBody} from '../src/scripts/shorekeeper/fidelity-profile.mjs';
import {liberationColorScore} from '../src/scripts/shorekeeper/combat-vfx-liberation.mjs';
import {createR62Integration} from '../src/scripts/shorekeeper/r62-integration.mjs';

const REST=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2).toArray();
const times=[0,.5,1.5],rib=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),3.05),ripple=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),.09);
const clip=(name,rootTrack)=>new T.AnimationClip(name,1.5,[rootTrack,
 new T.VectorKeyframeTrack('Bip001.position',times,[0,1,0, .1,1,0, 0,1,0]),new T.VectorKeyframeTrack('Skirt01.position',times,[0,0,0, 0,.1,0, 0,0,0])]);
const ribRoot=()=>new T.QuaternionKeyframeTrack('Root.quaternion',times,[...rib.toArray(),...rib.clone().multiply(ripple).toArray(),...rib.toArray()]);
const bodyRoot=(q=REST)=>new T.QuaternionKeyframeTrack('Root.quaternion',[0,1.5],[...q,...q]);
const lib=()=>[clip('SK_ATTACK_01_ORIGINAL',ribRoot()),clip('SK_BURST_02_ORIGINAL',ribRoot()),clip('SK_BURST_02_ORIGINAL_BODY',bodyRoot()),clip('SK_BURST_02_ORIGINAL_RIB',ribRoot())];
const snap=c=>JSON.stringify(c.tracks.map(t=>[t.name,Array.from(t.times),Array.from(t.values)]));

test('F1 profile ids and honest status (G7 stays NO_GO, nothing certified)',()=>{
 assert.equal(resolveProfile(''),PROFILE_ARTISTIC);assert.equal(resolveProfile('?profile=fidelity'),PROFILE_FIDELITY);assert.equal(resolveProfile('?profile=FIDELIDADE'),PROFILE_FIDELITY);assert.equal(resolveProfile('?profile=x'),PROFILE_ARTISTIC);
 assert.equal(FIDELITY_STATUS.G7,'NO_GO');assert.equal(FIDELITY_STATUS.liberationBody,'CANONICAL_PENDING');assert.equal(FIDELITY_STATUS.presentationVfx,'PRESENTATION_PARTIAL');
 assert.ok(Object.isFrozen(FIDELITY_STATUS));
});
test('F1 bodyLayerRoot: needs a static BODY-layer Root; no silent fallback',()=>{
 const q=bodyLayerRoot(lib(),'SK_BURST_02_ORIGINAL');REST.forEach((v,i)=>assert.ok(Math.abs(q[i]-v)<1e-6));
 assert.throws(()=>bodyLayerRoot([clip('SK_BURST_02_ORIGINAL',ribRoot())],'SK_BURST_02_ORIGINAL'),/BODY layer source missing/);
 assert.throws(()=>bodyLayerRoot([clip('SK_BURST_02_ORIGINAL_BODY',ribRoot())],'SK_BURST_02_ORIGINAL'),/not static/);
 assert.throws(()=>bodyLayerRoot([new T.AnimationClip('SK_BURST_02_ORIGINAL_BODY',1,[new T.VectorKeyframeTrack('Bip001.position',[0,1],[0,0,0,0,0,0])])],'SK_BURST_02_ORIGINAL'),/no Root.quaternion/);
});
test('F1 applyFidelityBody: Burst Root = BODY value; every other track untouched; originals unmodified; deterministic',()=>{
 const L=lib(),before=L.map(snap),model=new T.Group();
 const r=applyFidelityBody(T,model,L);
 assert.deepEqual(L.map(snap),before,'source clips are never modified');
 assert.equal(r.library.length,L.length);assert.equal(r.library[0],L[0],'non-Burst clip passed by reference');assert.equal(r.library[2],L[2]);assert.equal(r.library[3],L[3]);
 const fixed=r.library[1];assert.notEqual(fixed,L[1]);assert.equal(fixed.name,'SK_BURST_02_ORIGINAL');assert.equal(fixed.duration,L[1].duration);
 const root=fixed.tracks.find(t=>t.name==='Root.quaternion');assert.equal(root.values.length,8);REST.forEach((v,i)=>{assert.ok(Math.abs(root.values[i]-v)<1e-6);assert.ok(Math.abs(root.values[4+i]-v)<1e-6);});
 assert.deepEqual(fixed.tracks.map(t=>t.name),L[1].tracks.map(t=>t.name));
 for(const t of fixed.tracks.filter(t=>t.name!=='Root.quaternion')){const o=L[1].tracks.find(x=>x.name===t.name);assert.deepEqual(Array.from(t.values),Array.from(o.values));assert.deepEqual(Array.from(t.times),Array.from(o.times));}
 assert.equal(r.provenance.editedCurves,0);assert.equal(r.provenance.rootOwnership,'BODY_LAYER');assert.equal(r.derived[0].rootMode,'BODY_LAYER_STATIC');assert.equal(r.derived[0].ribRootKeyframes,3);
 const r2=applyFidelityBody(T,model,L);assert.equal(snap(r2.library[1]),snap(r.library[1]),'deterministic');
});
test('F1 applyFidelityBody refuses missing sources (no authorial substitution)',()=>{
 assert.throws(()=>applyFidelityBody(T,new T.Group(),[clip('SK_ATTACK_01_ORIGINAL',ribRoot())]),/no Burst source/);
 assert.throws(()=>applyFidelityBody(T,new T.Group(),[clip('SK_BURST_02_ORIGINAL',ribRoot())]),/BODY layer source missing/);
 assert.throws(()=>applyFidelityBody(T,new T.Group(),null),/animation library/);
 assert.deepEqual(BURST_ORIGINAL_IDS,['SK_BURST_01_ORIGINAL','SK_BURST_02_ORIGINAL']);
});
test('F1 sway/heading objective: the Rib Root ripple is gone, the body layer is untouched',()=>{
 const L=lib(),r=applyFidelityBody(T,new T.Group(),L),q=new T.Quaternion(),prev=new T.Quaternion();let maxStep=0;
 const it=r.library[1].tracks.find(t=>t.name==='Root.quaternion').createInterpolant();
 for(let t=0;t<=1.5;t+=1/60){q.fromArray(it.evaluate(t));if(t>0)maxStep=Math.max(maxStep,2*Math.acos(Math.min(1,Math.abs(q.dot(prev)))));prev.copy(q);}
 assert.ok(maxStep<2e-3,'Root rotation never moves (float noise only): '+maxStep);
 const it0=L[1].tracks.find(t=>t.name==='Root.quaternion').createInterpolant(),q0=new T.Quaternion().fromArray(it0.evaluate(0));let s0=0;for(let t=0;t<=1.5;t+=1/60){q.fromArray(it0.evaluate(t));s0=Math.max(s0,2*Math.acos(Math.min(1,Math.abs(q.dot(q0)))));}
 assert.ok(s0>5e-2,'the Rib Root of the source does move (that is the finding)');
});
test('F1 Stellarealm palette: FIDELIDADE keeps the field blue-white (no violet/gold hand-over); default unchanged',()=>{
 const g={violetStart:1,violetFull:2,goldStart:2.5,goldFull:3.5,absorbStart:4,butterflyStart:4.5,butterflyOpen:4.6,butterflyPeak:5,butterflyDissolve:5.6,butterflyEnd:6,triggerStart:.2,triggerFull:.4,triggerDissolve:.8,triggerEnd:1};
 let authorialGold=0;
 for(let t=0;t<=6;t+=.1){const f=liberationColorScore(t,g,false,'fidelity'),a=liberationColorScore(t,g,false);assert.equal(f.violet,0);assert.equal(f.gold,0);authorialGold=Math.max(authorialGold,a.gold);assert.deepEqual(liberationColorScore(t,g,false,'authorial'),a,'explicit authorial == default');
  assert.ok(f.hue[2]>=f.hue[0]&&f.hue[2]>=f.hue[1],'blue-dominant hue at t='+t);}
 assert.ok(authorialGold>0.9,'the default (G11.3) still reaches gold');
 // butterfly + absorb timing identical between profiles
 for(const t of [4.2,4.7,5.1,5.9]){const f=liberationColorScore(t,g,false,'fidelity'),a=liberationColorScore(t,g,false);assert.deepEqual(f.bf,a.bf);assert.equal(f.absorb,a.absorb);}
});
test('F1 integration rejects unknown profiles before touching the model',()=>{
 assert.throws(()=>createR62Integration(T,new T.Group(),[],{},{profile:'x'}),/Unknown presentation profile/);
 assert.throws(()=>createR62Integration(T,new T.Group(),[],{},{profile:PROFILE_FIDELITY,bodyStability:'standard'}),/source body only/);
});
