import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {BURST_ORIGINAL_IDS,BURST_REBASED_IDS,BURST_BODY_OWNED_IDS,createRebasedBurstClip,createBindRootBurstClip} from '../src/scripts/shorekeeper/liberation-rotation.mjs';
import {SOURCE_COMBAT_IDS,COMBAT_CLIP_IDS,validateCombatLibrary} from '../src/scripts/shorekeeper/combat-director.mjs';

const root=new T.Bone();root.name='Root';
const body=new T.Bone();body.name='Bip001';root.add(body);
const clothing=new T.Bone();clothing.name='Skirt01';body.add(clothing);
const model=new T.Group();model.add(root);
const bind=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);root.quaternion.copy(bind);
const first=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),3.05);
const yaw=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),.45);
const times=[0,.5,1.5];
const rtrack=new T.QuaternionKeyframeTrack('Root.quaternion',times,[...first.toArray(),...first.clone().multiply(yaw).toArray(),...first.toArray()]);
const btrack=new T.QuaternionKeyframeTrack('Bip001.quaternion',times,[0,0,0,1,...new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),.6).toArray(),0,0,0,1]);
const skirt=new T.VectorKeyframeTrack('Skirt01.position',times,[0,0,0, 0,.1,0, 0,0,0]);
const original=new T.AnimationClip(BURST_ORIGINAL_IDS[0],1.5,[rtrack,btrack,skirt]);
const snapshot=original.tracks.map(t=>({name:t.name,times:Array.from(t.times),values:Array.from(t.values)}));

const {clip:fixed,diagnostic}=createBindRootBurstClip(T,model,original);
assert.equal(fixed.name,BURST_BODY_OWNED_IDS[0]);
assert.deepEqual(diagnostic.changedTracks,['Root.quaternion']);
assert.equal(fixed.duration,original.duration);
assert.deepEqual(fixed.tracks.map(t=>t.name),original.tracks.map(t=>t.name));
assert.deepEqual(original.tracks.map(t=>({name:t.name,times:Array.from(t.times),values:Array.from(t.values)})),snapshot,'Source clips must be unchanged');
assert.deepEqual(Array.from(fixed.tracks[0].times),[0,1.5],'Static Root remains defined across the full clip');
for(let i=0;i<fixed.tracks[0].values.length;i+=4){
 const q=new T.Quaternion().fromArray(fixed.tracks[0].values,i);
 assert(q.angleTo(bind)<.002,'Root must be fixed at canonical bind quaternion');
}
for(let i=1;i<fixed.tracks.length;i++)assert.deepEqual(Array.from(fixed.tracks[i].values),snapshot[i].values,'Bip001 and Rib clothing remain untouched');
const rebased=createRebasedBurstClip(T,model,original).clip;
assert.equal(rebased.name,BURST_REBASED_IDS[0]);
assert.notDeepEqual(Array.from(rebased.tracks[0].values),Array.from(fixed.tracks[0].values),'Rebased preserves the wobble for comparison');
assert.deepEqual(Array.from(original.tracks[0].values),snapshot[0].values);

assert.equal(BURST_BODY_OWNED_IDS.length,2);
assert.equal(COMBAT_CLIP_IDS.length,SOURCE_COMBAT_IDS.length+BURST_REBASED_IDS.length+BURST_BODY_OWNED_IDS.length);
for(const id of BURST_BODY_OWNED_IDS){
 assert(COMBAT_CLIP_IDS.includes(id));
 assert(!SOURCE_COMBAT_IDS.includes(id),'Derived variants must not be accepted as source libraries');
}
const source={json:{asset:{extras:{skCombatLibrary:'2.1-c'}}},gltf:{animations:[original]}};
assert.deepEqual(validateCombatLibrary(T,model,source),[original]);
assert.throws(()=>validateCombatLibrary(T,model,{...source,gltf:{animations:[fixed]}}),/Identificador/);
assert.throws(()=>createBindRootBurstClip(T,model,new T.AnimationClip('SK_ATTACK_01_ORIGINAL',1.5,[rtrack,btrack])),/restricted/);
assert.throws(()=>createBindRootBurstClip(T,model,new T.AnimationClip(BURST_ORIGINAL_IDS[0],1.5,[btrack])),/one Root/);

const page=await readFile('src/pages/experimentos/sk/index.astro','utf8');
const lab=await readFile('src/scripts/shorekeeper-sk-lab.mjs','utf8');
for(const id of BURST_BODY_OWNED_IDS)assert(page.includes('value="'+id+'"'),'A/B option must exist in lab');
assert(lab.includes('createBindRootBurstClip(T,model,c)'));
assert(lab.includes('...rootOwned.map(row=>row.clip)'));
assert(lab.includes('director?.advance(dt)'),'Single render loop must remain intact');
console.log('Shorekeeper CL.1.1: Root-bind comparison, original/rebased preservation, source whitelist and manual UI PASS');
