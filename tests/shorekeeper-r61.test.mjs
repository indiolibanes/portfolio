import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {buildR61Plan,r61CueAt,r61CameraPose,R61_SOURCE_IDS,R61_STATUS} from '../src/scripts/shorekeeper/r61-plan.mjs';
import {createR61Director} from '../src/scripts/shorekeeper/r61-cinematic.mjs';
import {bodyOwner} from '../src/scripts/shorekeeper/animation-ownership.mjs';
import {cameraOwner} from '../src/scripts/shorekeeper/camera-ownership.mjs';

const fixture=()=>{
 const root=new T.Group(),bone=new T.Bone();bone.name='Root';root.add(bone);
 const library=R61_SOURCE_IDS.map((id,i)=>{
  const duration=i===6?2:1.8+i*.22;
  return new T.AnimationClip(id,duration,[
   new T.VectorKeyframeTrack('Root.position',[0,duration],[0,0,0,0,.06+i*.01,0])
  ]);
 });
 return {root,bone,library};
};
function fakeStage(){
 const camera=new T.PerspectiveCamera(34,16/9,.01,100),orbit={enabled:true,enableDamping:true,target:new T.Vector3(0,1,0)};
 camera.position.set(0,1,5);
 return {camera,orbit,changes:0,
  cameraConfig(){return {position:camera.position.toArray(),target:orbit.target.toArray(),fov:camera.fov,preset:'manual'};},
  restoreCamera(s){camera.position.fromArray(s.position);orbit.target.fromArray(s.target);camera.fov=s.fov??camera.fov;this.changes++;}
 };
}
function fakeVfx(){
 return {state:'OFF',mode:'FIELD_GAMEPLAY',stage:'inner',disposed:false,center:new T.Vector3(),scale:2,
  enabled:{field:false,canopy:false,butterflies:false,collapsedCore:false},
  root:new T.Group(),environment:{root:new T.Group()},
  setState(v){this.state=v;},setMode(v){this.mode=v;},setStage(v){this.stage=v;},setEnabled(k,v){this.enabled[k]=v;},renderPose(){}};
}

test('R61 plan requires seven exact original body sources; no fallback or B1 invention',()=>{
 const {library}=fixture(),plan=buildR61Plan(library);
 assert.equal(plan.schedule.segments.length,7);
 assert.equal(plan.schedule.duration>0,true);
 assert.equal(plan.status,R61_STATUS);
 assert.equal(plan.sourceFrame,null);
 assert.equal(plan.identity,'SOURCE_ROLE_UNVERIFIED');
 assert.match(plan.b1,/NO_SUSTAINED/);
 assert.deepEqual(plan.schedule.segments.map(s=>s.id),R61_SOURCE_IDS);
 assert.throws(()=>buildR61Plan(library.slice(1)),/incomplete sources: SK_ATTACK_01/);
 assert.throws(()=>buildR61Plan([...library,library[0]]),/incomplete sources:/);
 const modified=[...library];modified[3]=new T.AnimationClip('SK_ATTACK_L02_ORIGINAL',2,[new T.NumberKeyframeTrack('Face.morphTargetInfluences',[0,2],[0,1])]);
 assert.throws(()=>buildR61Plan(modified),/invalid body source/);
});

test('R61 cue transitions and portrait framing are authored, absolute and monotonic',()=>{
 const {library}=fixture(),plan=buildR61Plan(library);
 const order=['THREE_BASIC_CANDIDATES','HEAVY_ATTACK_CANDIDATE','RESONANCE_SKILL_CANDIDATE','BURST02_INTRO_B1_UNVERIFIED','OUTER_FIELD_AUTHORIAL','LIBERATION_PEAK_AUTHORIAL','FIELD_PERSIST_AUTHORIAL','RETURN_NO_CERTIFIED_LANDING','IDLE'];
 assert.deepEqual(plan.cues.map(x=>x.beat),order);
 assert.ok(plan.cues.every((x,i)=>i===0||x.t>=plan.cues[i-1].t));
 for(const cue of plan.cues)assert.equal(r61CueAt(plan,cue.t).beat,cue.beat);
 assert.throws(()=>r61CueAt(plan,-1));
 const d=plan.cues[5].t;
 assert.ok(r61CameraPose(plan,d,390/640).radius>r61CameraPose(plan,d,16/9).radius);
 assert.ok(r61CameraPose(plan,d).fov>=15);
});

test('R61 owns one body mixer and camera, drives original tracks and restores VFX',()=>{
 const {root,library}=fixture(),stage=fakeStage(),vfx=fakeVfx();
 const baseline=JSON.stringify(library.map(c=>c.toJSON())),saved=stage.cameraConfig(),events=[];
 const director=createR61Director(T,root,library,stage,{getVfx:()=>vfx,camera:true,onEvent:e=>events.push(e)});
 assert.equal(bodyOwner(root),'combo');
 director.start();
 assert.equal(cameraOwner(stage),'r61-cinematic');
 assert.equal(stage.orbit.enabled,false);
 assert.equal(vfx.mode,'BOTH');assert.equal(vfx.stage,'outer');
 assert.ok(Object.values(vfx.enabled).every(Boolean),'Outer presentation re-enables systems');
 const target=director.plan.cues.find(c=>c.beat==='LIBERATION_PEAK_AUTHORIAL').t;
 director.seek(target);
 assert.equal(director.state.cue,'LIBERATION_PEAK_AUTHORIAL');
 assert.equal(director.state.vfxCue,'RESONANCE_PEAK');
 assert.equal(vfx.state,'RESONANCE_PEAK');
 assert.equal(director.state.sourceFrame,null);
 director.setPaused(true);const before=director.state.clock;director.advance(1);assert.equal(director.state.clock,before);
 director.setPaused(false);director.advance(.1);
 director.interrupt();
 assert.equal(cameraOwner(stage),null);
 assert.equal(stage.orbit.enabled,true);
 assert.equal(stage.orbit.enableDamping,true);
 assert.equal(vfx.state,'OFF');
 assert.equal(vfx.mode,'FIELD_GAMEPLAY');assert.equal(vfx.stage,'inner');
 assert.ok(Object.values(vfx.enabled).every(v=>!v),'all manually disabled systems restored');
 director.advance(.6);
 director.start();
 director.seek(0);
 assert.equal(cameraOwner(stage),'r61-cinematic');
 director.dispose();director.dispose();
 assert.equal(cameraOwner(stage),null);
 assert.equal(bodyOwner(root),null);
 assert.deepEqual(stage.camera.position.toArray(),saved.position);
 assert.deepEqual(stage.orbit.target.toArray(),saved.target);
 assert.equal(JSON.stringify(library.map(c=>c.toJSON())),baseline);
 assert.ok(events.some(e=>e.type==='start'));
});

test('R61 playback completes without extra RAF or synthetic source-frame markers',()=>{
 const {root,library}=fixture(),stage=fakeStage(),vfx=fakeVfx();
 const director=createR61Director(T,root,library,stage,{getVfx:()=>vfx,camera:false});
 director.start();assert.equal(cameraOwner(stage),null);
 let guard=0;while(director.state.phase!=='idle'&&guard++<1000)director.advance(.2);
 assert.ok(guard<1000);
 assert.equal(director.state.phase,'idle');
 assert.equal(director.state.presentationActive,false);
 assert.equal(vfx.state,'OFF');
 assert.equal(director.state.identity,'SOURCE_ROLE_UNVERIFIED');
 director.dispose();
 const lab=readFileSync(new URL('../src/scripts/shorekeeper-sk-lab.mjs',import.meta.url),'utf8');
 const page=readFileSync(new URL('../src/pages/experimentos/sk/index.astro',import.meta.url),'utf8');
 assert.match(lab,/createR61Director/);
 assert.match(lab,/presentationClock\.reset\(\);presentationClock\.setSpeed/);
 assert.match(lab,/director\?\.advance\(dt\)/);
 assert.match(lab,/if\(d\?\.mode==='R61_EXPERIMENTAL'\)/);
 assert.match(lab,/const wantCamera=\$\('\[data-r61-camera\]'\)\.checked&&!motion\.matches/);
 assert.match(page,/data-r61-preview hidden/);
 assert.match(page,/sourceFrame PSA/);
 assert.ok(!/requestAnimationFrame|setInterval|setTimeout/.test(readFileSync(new URL('../src/scripts/shorekeeper/r61-cinematic.mjs',import.meta.url),'utf8')));
});
