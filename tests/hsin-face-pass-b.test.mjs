import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
import {createAttentionDirector} from '../src/scripts/hsin-face-pass-b.mjs';
import {PASS_B_NAMES,auditFacialMorphs} from '../src/scripts/hsin-face-morph-audit.mjs';
import {createFaceBinding,snapshotFace,calibratePupils,FACE_ACTING_NAMES} from '../src/scripts/hsin-face-rig.mjs';
import {createFacialSession} from '../src/scripts/hsin-face-session.mjs';
const limits=Object.fromEntries(PASS_B_NAMES.map(n=>[n,n.startsWith('P_Nose')?.04:n.startsWith('E_')?.08:.12]));
const axes={horizontal:[0,0,1],vertical:[0,1,0]};
// A remains exactly available. B at intensity zero adds no new expression/gaze behavior.
const a=createFacialActing({seed:8}),zero=createFacialActing({seed:8,pass:'b',intensity:0});
for(let i=0;i<5000;i++){if(i%200===0){a.attention([.5,0,0]);zero.attention([.5,0,0]);}assert.deepEqual(a.advance(.02),zero.advance(.02));}
function trace(seed){const b=createFacialActing({seed,pass:'b',morphLimits:limits,gazeAxes:axes}),events=[];let state='';
 for(let i=0;i<6000;i++){if(i%300===0)b.attention([0,.2,.8],2);const s=b.advance(.02);const d=b.diagnostics();
  if(d.attention.state!==state){state=d.attention.state;events.push([i,state]);}
  assert.ok(Math.hypot(...s.gaze)<=.240001);assert.equal(s.gaze[0],0,'micro-saccades must stay in measured tangent plane');
  assert.equal(s.overlays.P_Nose_Up??0,0,'nose must never enter autonomous presentation');
  assert.equal(s.overlays.P_Nose_Down??0,0);assert.ok(s.smileR<=.12&&s.smileL<=.12);
  if(s.event==='wink')assert.equal(s.closeL,0);
 }return events;}
const sequence=trace(13);assert.deepEqual(sequence,trace(13));assert.notDeepEqual(sequence,trace(14));for(const expected of ['acquire','hold','avert','return','neutral'])assert.ok(sequence.some(([,state])=>state===expected),expected);
const attention=createAttentionDirector({seed:4,axes});let output;for(let i=0;i<15;i++)output=attention.step(.02,[0,0,.2]);
assert.equal(attention.diagnostics().state,'hold');const fixed=[...output];
for(let i=0;i<5;i++)output=attention.step(.02,[0,0,-.2]);assert.ok(output[2]>0,'fixation must not chase pixel-by-pixel cursor reversals');
const frozen=attention.diagnostics();attention.step(.05,[0,1,0],{closed:true});assert.deepEqual(attention.diagnostics(),frozen,'attention must freeze while eyelids close');
const manual=createFacialActing({pass:'b',morphLimits:limits,enabled:{blink:false,wink:false,smirk:false}});
assert.equal(manual.testMorph('missing'),false);assert.equal(manual.testMorph('P_Nose_Up'),true);
let nosePeak=0;for(let i=0;i<100;i++){const s=manual.advance(.02);nosePeak=Math.max(nosePeak,s.overlays.P_Nose_Up??0);assert.equal(s.closeR,0);assert.equal(s.closeL,0);}
assert.ok(nosePeak>0&&nosePeak<=.04);assert.equal(manual.sample().overlays.P_Nose_Up??0,0);
assert.equal(manual.testBeat('nose-smile'),true);let beatNose=0;for(let i=0;i<180;i++)beatNose=Math.max(beatNose,manual.advance(.02).overlays.P_Nose_Up??0);assert.ok(beatNose>0);
const body=createFacialActing({pass:'b',morphLimits:limits,enabled:{blink:false,wink:false}});body.signal('gesture:prepare');for(let i=0;i<60;i++)body.advance(.02);assert.ok(body.sample().smileR>0);body.signal('gesture:hold');for(let i=0;i<60;i++)body.advance(.02);const held=body.sample().smileR;body.signal('gesture:release');for(let i=0;i<120;i++)body.advance(.02);assert.ok(body.sample().smileR<held*.1);

// Synthetic morph geometry for audit, composition and session lifecycle; no private assets.
const names=[...new Set([...FACE_ACTING_NAMES,...PASS_B_NAMES,'Untouched'])],geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.04,.1,0,-.03,.11,0,-.05,.11,0,.04,.1,0,.03,.11,0,.05,.11,0],3));geometry.morphTargetsRelative=true;
geometry.morphAttributes.position=names.map(name=>{const v=new Float32Array(18),left=name.endsWith('_L');for(let k=(left?3:0);k<(left?6:3);k++){
 if(name.startsWith('Pupil_')){if(name.includes('_Up_'))v[k*3+1]=.01;if(name.includes('_Down_'))v[k*3+1]=-.01;if(name.includes('_In_'))v[k*3]=left?-.01:.01;if(name.includes('_Out_'))v[k*3]=left?.01:-.01;}
 else if(name!=='Untouched')v[k*3+1]=.004;
}return new THREE.BufferAttribute(v,3);});
const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());mesh.morphTargetDictionary=Object.fromEntries(names.map((n,i)=>[n,i]));mesh.morphTargetInfluences=names.map(()=>.13);mesh.name='synthetic';
const head=new THREE.Bone(),scene=new THREE.Scene();scene.add(head);head.add(mesh);scene.updateMatrixWorld(true);
const baseline=snapshotFace([mesh]),cal=calibratePupils(THREE,[mesh],head),audit=auditFacialMorphs(THREE,[mesh],head,cal);assert.equal(cal.ready,true);assert.equal(audit.rows.length,12);assert.ok(audit.rows.every(row=>row.eligible));assert.deepEqual(mesh.morphTargetInfluences,baseline.get(mesh));
assert.ok(audit.rows.find(r=>r.name==='E_Smile_R').overlapCloseR>.9);
const bind=createFaceBinding([mesh],baseline,cal,audit),i=n=>mesh.morphTargetDictionary[n];
bind.apply({policy:'b',closeR:1,closeL:0,smileR:.06,smileL:0,gaze:[0,0,0],overlays:{E_Smile_R:.08,E_Smile_L:.08,B_Up_Add_R:.1,P_Nose_Up:10}});
assert.equal(mesh.morphTargetInfluences[i('E_Smile_R')],.13,'closed eyelid suppresses squint overlay');assert.ok(mesh.morphTargetInfluences[i('E_Smile_L')]>.13);assert.equal(mesh.morphTargetInfluences[i('Untouched')],.13);assert.ok(mesh.morphTargetInfluences[i('P_Nose_Up')]<=.13+.87*.04+1e-9);bind.restore();assert.deepEqual(mesh.morphTargetInfluences,baseline.get(mesh));
const noHead=auditFacialMorphs(THREE,[mesh],null,{});assert.ok(noHead.rows.every(r=>!r.eligible&&r.candidateCap===0));
const missing=auditFacialMorphs(THREE,[],head,cal);assert.equal(Object.keys(missing.limits).length,0);
let next=0,queue=new Map(),now=0;const events=new Map(),canvas={addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n),getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},camera=new THREE.PerspectiveCamera(35,1,.01,10);camera.position.z=1;camera.updateMatrixWorld(true);
const session=createFacialSession({THREE,meshes:[mesh],head,camera,canvas,pass:'b',invalidate(){},requestFrame:fn=>{queue.set(++next,fn);return next},cancelFrame:n=>queue.delete(n)});
const frame=(ms=20)=>{now+=ms;const q=[...queue.values()];queue.clear();q.forEach(fn=>fn(now));};session.start();session.signal('gesture:hold');for(let n=0;n<90;n++)frame();session.setVisible(false);assert.equal(queue.size,0);const clock=session.diagnostics().acting.clock;now+=10000;session.setVisible(true);frame();assert.equal(session.diagnostics().acting.clock,clock);
session.setPass('a');assert.deepEqual(mesh.morphTargetInfluences,baseline.get(mesh));assert.equal(session.diagnostics().profile,'a');session.setPass('b');assert.deepEqual(mesh.morphTargetInfluences,baseline.get(mesh));session.setReduced(true);assert.equal(queue.size,0);assert.equal(session.testMorph('P_Nose_Up'),false);session.dispose({restore:true});assert.equal(events.size,0);assert.equal(queue.size,0);assert.deepEqual(mesh.morphTargetInfluences,baseline.get(mesh));geometry.dispose();mesh.material.dispose();
console.log('Pass B: seeded fixation, lid arbitration, geometry audit, composition, body cues, A/B and lifecycle PASS');
