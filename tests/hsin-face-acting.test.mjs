import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
import {FACE_ACTING_NAMES,calibratePupils,snapshotFace,restoreFace,createFaceBinding,cursorHeadOffset,projectGazeOffset} from '../src/scripts/hsin-face-rig.mjs';
import {createFacialSession} from '../src/scripts/hsin-face-session.mjs';

// Deterministic clock and mutually exclusive bilateral/unilateral events.
const clock=createFacialActing({enabled:{blink:false,wink:false,smirk:false,gaze:false}});
assert.equal(clock.trigger('wink'),true);assert.equal(clock.trigger('blink'),false);
let peak=0;for(let i=0;i<90;i++){const state=clock.advance(1/120);peak=Math.max(peak,state.closeR);assert.equal(state.closeL,0);}
assert.ok(peak>.99);assert.equal(clock.sample().closeR,0);
assert.equal(clock.trigger('blink'),true);
for(let i=0;i<80;i++){const state=clock.advance(1/120);assert.equal(state.closeR,state.closeL);}
assert.equal(clock.sample().closeR,0);
const trace=seed=>{const a=createFacialActing({seed}), events=[];let prev=null;for(let i=0;i<7200;i++){const s=a.advance(1/120);if(s.event!==prev){events.push([i,s.event]);prev=s.event;}assert.ok(s.smileR<=.101&&s.smileL<=.019);assert.ok(Math.hypot(...s.gaze)<=.240001);}return events;};
assert.deepEqual(trace(9),trace(9));assert.notDeepEqual(trace(9),trace(10));assert.ok(trace(9).some(([,event])=>event==='wink'));
const gaze=createFacialActing({enabled:{blink:false,wink:false}});gaze.attention([.02,0,0]);for(let i=0;i<30;i++)gaze.advance(.02);assert.equal(Math.hypot(...gaze.sample().gaze),0);
gaze.attention([10,0,0],1);for(let i=0;i<35;i++)gaze.advance(.02);assert.ok(gaze.sample().gaze[0]>.2);for(let i=0;i<180;i++)gaze.advance(.02);assert.deepEqual(gaze.sample().gaze,[0,0,0]);assert.throws(()=>gaze.advance(NaN));

// Synthetic geometry. No character assets or inferred anatomical side assumptions.
const names=[...FACE_ACTING_NAMES,'Unrelated'];
function sampleMesh(){
 const geometry=new THREE.BufferGeometry();
 const positions=[-.03,.08,0,-.02,.09,0,-.04,.09,0,.03,.08,0,.02,.09,0,.04,.09,0];
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.morphTargetsRelative=true;
 geometry.morphAttributes.position=names.map(name=>{
  const data=new Float32Array(18);const side=name.endsWith('_L')?1:0;
  for(let k=side*3;k<side*3+3;k++){
   if(name.includes('Pupil_Up'))data[k*3+1]=.01;
   if(name.includes('Pupil_Down'))data[k*3+1]=-.01;
   if(name.includes('Pupil_In'))data[k*3]=side?- .01:.01;
   if(name.includes('Pupil_Out'))data[k*3]=side?.01:-.01;
  }return new THREE.BufferAttribute(data,3);
 });
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());mesh.name='synthetic eyes';mesh.morphTargetDictionary=Object.fromEntries(names.map((n,i)=>[n,i]));mesh.morphTargetInfluences=names.map((_,i)=>i===names.length-1?-.17:.12);return mesh;
}
const mesh=sampleMesh(), head=new THREE.Bone(), scene=new THREE.Scene();head.name='ORG-Bip001Head';scene.add(head);head.add(mesh);scene.updateMatrixWorld(true);
const original=snapshotFace([mesh]), calibration=calibratePupils(THREE,[mesh],head);assert.equal(calibration.ready,true);assert.deepEqual(mesh.morphTargetInfluences,original.get(mesh));
assert.ok(calibration.directions.Pupil_In_R[0]>.99);assert.ok(calibration.directions.Pupil_In_L[0]<-.99);
const binding=createFaceBinding([mesh],original,calibration), index=name=>mesh.morphTargetDictionary[name];
binding.apply({closeR:1,closeL:0,smileR:.09,smileL:.01,gaze:[.2,0,0]});
assert.equal(mesh.morphTargetInfluences[index('E_Close_R')],1);assert.equal(mesh.morphTargetInfluences[index('E_Close_L')],.12);
assert.ok(mesh.morphTargetInfluences[index('M_Smile_R')]>.12);assert.ok(mesh.morphTargetInfluences[index('Pupil_In_R')]>mesh.morphTargetInfluences[index('Pupil_Out_R')] );assert.ok(mesh.morphTargetInfluences[index('Pupil_Out_L')]>mesh.morphTargetInfluences[index('Pupil_In_L')] );
assert.equal(mesh.morphTargetInfluences[index('Unrelated')],-.17);binding.restore();assert.deepEqual(mesh.morphTargetInfluences,original.get(mesh));
const camera=new THREE.PerspectiveCamera(35,1,.01,100);camera.position.set(0,0,1);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
let offset=cursorHeadOffset(THREE,new THREE.Vector2(.5,0),camera,head,.2);assert.ok(offset[0]>0);
head.rotation.z=Math.PI/2;scene.updateMatrixWorld(true);offset=cursorHeadOffset(THREE,new THREE.Vector2(.5,0),camera,head,.2);assert.ok(offset[1]<0);assert.ok(Math.abs(offset[0])<1e-6,'screen X must rotate into head-local Y');
head.rotation.set(0,0,0);scene.updateMatrixWorld(true);assert.ok(projectGazeOffset(THREE,[.5,.3,10],calibration)[2]<1e-6);
assert.equal(calibratePupils(THREE,[mesh],null).ready,false);

// Session lifecycle: pause preserves the current face, hidden/reduced cancel rAF,
// A/B restores exact snapshots, touch expires, and dispose removes all listeners.
let serial=0, jobs=new Map(), now=0;const listeners=new Map();
const canvas={addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n),getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})};
const session=createFacialSession({THREE,meshes:[mesh],head,camera,canvas,invalidate(){},requestFrame:fn=>{jobs.set(++serial,fn);return serial},cancelFrame:id=>jobs.delete(id)});
const frame=(ms=20)=>{now+=ms;const list=[...jobs.values()];jobs.clear();list.forEach(fn=>fn(now));};
assert.equal(session.start(),true);assert.equal(session.test('wink'),true);for(let i=0;i<10;i++)frame();const paused=[...mesh.morphTargetInfluences];session.pause();assert.equal(jobs.size,0);frame(100000);assert.deepEqual(mesh.morphTargetInfluences,paused);
session.start();session.setVisible(false);assert.equal(jobs.size,0);const elapsed=session.diagnostics().acting.clock;now+=100000;session.setVisible(true);frame();assert.equal(session.diagnostics().acting.clock,elapsed,'hidden time must not advance');
session.setReduced(true);assert.equal(jobs.size,0);const reduced=[...mesh.morphTargetInfluences];frame(10000);assert.deepEqual(mesh.morphTargetInfluences,reduced);session.setReduced(false);frame();
const candidate=[...mesh.morphTargetInfluences];assert.equal(session.compare(),'baseline');assert.deepEqual(mesh.morphTargetInfluences,original.get(mesh));assert.equal(session.compare(),'candidate');assert.deepEqual(mesh.morphTargetInfluences,candidate);
session.start();listeners.get('pointerdown')({type:'pointerdown',pointerType:'touch',clientX:80,clientY:50});for(let i=0;i<40;i++)frame();assert.ok(Math.hypot(...session.diagnostics().acting.gaze)>.05);for(let i=0;i<180;i++)frame();assert.ok(Math.hypot(...session.diagnostics().acting.gaze)<1e-4);
session.dispose({restore:true});assert.equal(jobs.size,0);assert.equal(listeners.size,0);assert.deepEqual(mesh.morphTargetInfluences,original.get(mesh));
mesh.geometry.dispose();mesh.material.dispose();console.log('Facial acting: deterministic timing, channel ownership, geometry gaze, lifecycle and exact A/B restore PASS');
