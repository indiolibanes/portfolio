import {createFacialSession} from '../src/scripts/hsin-face-session.mjs';
import {PUPIL_NAMES} from '../src/scripts/hsin-face-rig.mjs';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
import {createAttentionDirector} from '../src/scripts/hsin-face-pass-b.mjs';
import {PRESENTATION_ATTENTION} from '../src/scripts/hsin-face-presentation.mjs';
import {PASS_B_NAMES} from '../src/scripts/hsin-face-morph-audit.mjs';
import {createPresentationMode} from '../src/scripts/hsin-presentation-mode.mjs';
import {solveSignatureElbow,createLeftSignaturePose} from '../src/scripts/hsin-left-signature.mjs';
const limits=Object.fromEntries(PASS_B_NAMES.map(n=>[n,n.startsWith('P_Nose')?.04:n.startsWith('E_')?.08:.12]));
const axes={horizontal:[1,0,0],vertical:[0,1,0]};
const make=(options={})=>createFacialActing({pass:'presentation',intensity:.75,morphLimits:limits,gazeAxes:axes,...options});
// Automatic bilateral blinks: wait measured from previous complete opening.
const blink=make({enabled:{wink:false}});let lastEvent=null,previousEnd=0,count=0;
for(let i=0;i<36000;i++){
 const s=blink.advance(1/60);
 if(s.event==='blink'&&lastEvent===null){const gap=s.clock-previousEnd;assert.ok(gap>=5-1/60&&gap<=10+1/60,`blink gap ${gap}`);count++;}
 if(s.event===null&&lastEvent==='blink')previousEnd=s.clock;
 assert.equal(s.closeL,s.closeR);assert.ok(s.smileR>.06&&s.smileR<=.12);assert.ok(s.smileL<s.smileR||s.smileL<=.12);
 assert.equal(s.overlays.P_Nose_Up??0,0);assert.equal(s.overlays.P_Nose_Down??0,0);lastEvent=s.event;
}assert.ok(count>60);
function events(seed){const c=make({seed}),out=[];let last=null;for(let i=0;i<36000;i++){const s=c.advance(1/60);if(s.event!==last){if(s.event)out.push([s.clock,s.event,c.diagnostics().event.origin]);last=s.event;}if(s.event==='wink')assert.equal(s.closeL,0);if(s.event==='wink-left')assert.equal(s.closeR,0);}return out;}
const trace=events(39);assert.deepEqual(trace,events(39));assert.notDeepEqual(trace,events(40));assert.ok(trace.some(([,e])=>e==='wink'));assert.ok(trace.some(([,e])=>e==='wink-left'));
assert.ok(events(1).some(([,e,origin])=>e!=='blink'&&origin==='expression'),'some seeded winks follow an expression');assert.ok(trace.some(([,e,origin])=>e!=='blink'&&origin==='calendar'),'some winks are independent');
const winks=trace.filter(([,e])=>e!=='blink');assert.ok(winks.length<trace.length/2);for(let i=1;i<winks.length;i++)assert.ok(winks[i][0]-winks[i-1][0]>=22);
const manual=make({enabled:{blink:false,wink:false}});assert.equal(manual.trigger('wink-left'),true);assert.equal(manual.trigger('blink'),false);let peak=0;for(let i=0;i<90;i++){const s=manual.advance(1/120);assert.equal(s.closeR,0);peak=Math.max(peak,s.closeL);}assert.equal(peak,1);
// Faster response, longer fixation, retained attention on leave, bounded return.
const a=createAttentionDirector({seed:8,axes,timing:PRESENTATION_ATTENTION});let output;for(let i=0;i<10;i++)output=a.step(.016,[.2,0,0]);assert.ok(output[0]>.18);
for(let i=0;i<110;i++)output=a.step(.016,[.2,0,0]);assert.equal(a.diagnostics().state,'hold');assert.ok(output[0]>.18);
for(let i=0;i<20;i++)output=a.step(.016,[0,0,0]);assert.ok(output[0]>.18,'leave should not immediately drop fixation');
for(let i=0;i<130;i++)output=a.step(.016,[0,0,0]);assert.deepEqual(output,[0,0,0]);
const touch=make({enabled:{blink:false,wink:false}});touch.attention([1,0,0],4.2);for(let i=0;i<150;i++)touch.advance(.02);assert.ok(Math.hypot(...touch.sample().gaze)>.15);for(let i=0;i<250;i++)touch.advance(.02);assert.ok(Math.hypot(...touch.sample().gaze)<.02);
// Mode boundary never exposes the author panel in the initial presentation.
const attrs=()=>({values:{},setAttribute(n,v){this.values[n]=v}}),root={dataset:{}},panel={hidden:false},present=attrs(),lab=attrs();
const modes=createPresentationMode({root,panel,presentationButton:present,labButton:lab,access:'lab'});assert.equal(panel.hidden,true);assert.equal(root.dataset.experience,'presentation');modes.set('lab');assert.equal(panel.hidden,false);assert.equal(lab.values['aria-pressed'],'true');modes.set('presentation');assert.equal(panel.hidden,true);assert.equal(modes.set('invalid'),false);
// Two-bone geometry respects exact lengths; unreachable and degenerate poles refuse.
const origin=new THREE.Vector3(),target=new THREE.Vector3(.1,.2,0),solution=solveSignatureElbow(THREE,origin,target,.22,.22,new THREE.Vector3(1,-1,1));assert.ok(solution);assert.ok(Math.abs(solution.elbow.distanceTo(origin)-.22)<1e-10);assert.ok(Math.abs(solution.elbow.distanceTo(target)-.22)<1e-10);assert.equal(solveSignatureElbow(THREE,origin,new THREE.Vector3(1,0,0),.22,.22,new THREE.Vector3(0,1,0)),null);
const absent=createLeftSignaturePose({THREE,bones:[],meshes:[],head:null,calibration:{ready:false}});assert.equal(absent.apply(),false);assert.equal(absent.diagnostics().ready,false);absent.restore();
// Presentation session: real pointer listeners, touch expiry, pause/reduced/hidden and profile restore.
const morphNames=[...new Set([...PASS_B_NAMES,...PUPIL_NAMES,'E_Close_R','E_Close_L'])],geo=new THREE.BufferGeometry();
geo.setAttribute('position',new THREE.Float32BufferAttribute([-.03,.08,0,-.02,.09,0,.03,.08,0,.02,.09,0],3));geo.morphTargetsRelative=true;
geo.morphAttributes.position=morphNames.map(name=>{const d=new Float32Array(12),left=name.endsWith('_L');for(let k=left?2:0;k<(left?4:2);k++){if(name.startsWith('Pupil_')){if(name.includes('_Up_'))d[k*3+1]=.01;if(name.includes('_Down_'))d[k*3+1]=-.01;if(name.includes('_In_'))d[k*3]=left?-.01:.01;if(name.includes('_Out_'))d[k*3]=left?.01:-.01;}else d[k*3+1]=.004;}return new THREE.BufferAttribute(d,3);});
const eyeMesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial()),head=new THREE.Bone();eyeMesh.morphTargetDictionary=Object.fromEntries(morphNames.map((n,i)=>[n,i]));eyeMesh.morphTargetInfluences=morphNames.map(()=>.12);head.add(eyeMesh);head.updateMatrixWorld(true);
const baseline=[...eyeMesh.morphTargetInfluences],listeners=new Map(),jobs=new Map();let serial=0,now=0;
const canvas={addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n),getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},camera=new THREE.PerspectiveCamera(35,1,.01,10);camera.position.z=1;camera.updateMatrixWorld(true);
const session=createFacialSession({THREE,meshes:[eyeMesh],head,camera,canvas,pass:'presentation',intensity:.75,invalidate(){},requestFrame:f=>{jobs.set(++serial,f);return serial},cancelFrame:id=>jobs.delete(id)});
const frame=()=>{now+=20;const q=[...jobs.values()];jobs.clear();q.forEach(fn=>fn(now));};
session.start();listeners.get('pointerdown')({type:'pointerdown',pointerType:'touch',clientX:80,clientY:50});for(let i=0;i<125;i++)frame();assert.ok(Math.hypot(...session.diagnostics().acting.gaze)>.15,'presentation touch sustains beyond old 1.3 s expiry');
for(let i=0;i<300;i++)frame();assert.ok(Math.hypot(...session.diagnostics().acting.gaze)<.02);session.pause();const frozen=[...eyeMesh.morphTargetInfluences];assert.equal(jobs.size,0);session.start();session.setReduced(true);assert.equal(jobs.size,0);assert.equal(session.test('wink-left'),false);assert.deepEqual(eyeMesh.morphTargetInfluences,frozen);session.setReduced(false);session.setVisible(false);const clock=session.diagnostics().acting.clock;now+=20000;session.setVisible(true);frame();assert.equal(session.diagnostics().acting.clock,clock);
session.setPass('a');assert.deepEqual(eyeMesh.morphTargetInfluences,baseline);session.setPass('b');assert.deepEqual(eyeMesh.morphTargetInfluences,baseline);session.setPass('presentation');assert.deepEqual(eyeMesh.morphTargetInfluences,baseline);session.dispose({restore:true});assert.equal(jobs.size,0);assert.equal(listeners.size,0);assert.deepEqual(eyeMesh.morphTargetInfluences,baseline);geo.dispose();eyeMesh.material.dispose();
// HTML/TS boundary: the hidden lab still must supply every required controller element.
const html=await readFile(new URL('../src/pages/experimentos/hsin-lab/index.astro',import.meta.url),'utf8'),source=await readFile(new URL('../src/scripts/hsin-local-lab.ts',import.meta.url),'utf8');
for(const match of source.matchAll(/q<[^;\n]+?>\('(\[data-[^\]]+\])'\)/g)){const attribute=match[1].slice(1,-1);assert.ok(html.includes(attribute),'Required lab element missing: '+attribute);}
assert.ok(html.includes('data-hsin-laboratory hidden'));
console.log('Presentation: 5–10s blinks, seeded dual winks, sustained baseline/attention, transient touch, clean mode boundary and left-chain geometry PASS');
const labOnly=[{hidden:false},{hidden:false}],structuralRoot={dataset:{},querySelectorAll:selector=>selector==='[data-hsin-lab-only]'?labOnly:[]};
const structural=createPresentationMode({root:structuralRoot,panel:{hidden:false},presentationButton:attrs(),labButton:attrs(),access:'lab'});
assert.ok(labOnly.every(element=>element.hidden));structural.set('lab');assert.ok(labOnly.every(element=>!element.hidden));structural.set('presentation');assert.ok(labOnly.every(element=>element.hidden));
