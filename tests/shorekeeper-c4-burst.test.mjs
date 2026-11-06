import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {BURST_COMBAT_IDS,COMBAT_CLIP_IDS,ORIGINAL_ATTACK_IDS,validateCombatLibrary,createCombatDirector} from '../src/scripts/shorekeeper/combat-director.mjs';

assert.deepEqual(ORIGINAL_ATTACK_IDS,[
 'SK_ATTACK_01_ORIGINAL','SK_ATTACK_02_ORIGINAL','SK_ATTACK_03_ORIGINAL','SK_ATTACK_04_ORIGINAL'
]);
assert.deepEqual(BURST_COMBAT_IDS,['SK_BURST_01_ORIGINAL','SK_BURST_02_ORIGINAL']);
assert(COMBAT_CLIP_IDS.length>=10,'all 10 original source combat clips must remain available');
for(const id of [...ORIGINAL_ATTACK_IDS,...BURST_COMBAT_IDS])assert(COMBAT_CLIP_IDS.includes(id),'missing approved source id: '+id);
const root=new T.Group(),bone=new T.Bone();bone.name='Root';root.add(bone);
const clipFor=(name)=>new T.AnimationClip(name,.75,[new T.VectorKeyframeTrack('Root.position',[0,.75],[0,0,0,.5,0,0])]);
for(const id of BURST_COMBAT_IDS){
 const clips=[clipFor(id),clipFor(id+'_BODY'),clipFor(id+'_RIB')];
 const source={json:{asset:{extras:{skCombatLibrary:'2.1-c',skCombatBatch:'advanced'}}},gltf:{animations:clips}};
 assert.deepEqual(validateCombatLibrary(T,root,source),clips);
 const d=createCombatDirector(T,root,clips,{enter:.1,exit:.1});
 assert(d.playAttack(id),'Must play original advanced clip');
 assert.equal(d.playAttack(id),false,'No simultaneous attack ownership');
 d.advance(.1);d.advance(.3);d.pause();const before=d.getState().animation.clock;d.advance(1);
 assert.equal(d.getState().animation.clock,before,'Paused clock is frozen');
 d.resume();d.interrupt();d.advance(.11);
 assert.equal(d.getState().animation.phase,'idle');
 assert(Math.abs(bone.position.x)<1e-9,'Exact rest after recovery');
 d.dispose();
}
const unknown=clipFor('SK_FAKE_POWER_ORIGINAL');assert.throws(()=>validateCombatLibrary(T,root,{json:{asset:{extras:{skCombatLibrary:'2.1-c'}}},gltf:{animations:[unknown]}}),/Identificador/);
const foreign=new T.NumberKeyframeTrack('Root.morphTargetInfluences[0]',[0,1],[0,1]);
assert.throws(()=>validateCombatLibrary(T,root,{json:{asset:{extras:{skCombatLibrary:'2.1-c'}}},gltf:{animations:[new T.AnimationClip(BURST_COMBAT_IDS[0],1,[foreign])]}}),/Canal corporal/);
const page=await readFile('src/pages/experimentos/sk/index.astro','utf8');
const runtime=await readFile('src/scripts/shorekeeper-sk-lab.mjs','utf8');
const converter=await readFile('scripts/shorekeeper/convert-burst.py','utf8');
for(const id of BURST_COMBAT_IDS)assert(page.includes('value="'+id+'"'),'Advanced move absent from select: '+id);
assert.match(runtime,/COMBAT_CLIP_IDS/);
assert.match(runtime,/director\?\.advance\(dt\)/);
assert(!runtime.includes('combatDirector.advance'),'No second render-loop combat director');
assert.match(converter,/shorekeeper-burst-preflight\/1/);
assert.match(converter,/Private output must be outside repository/);
assert.match(converter,/Ambiguous animated ownership/);
assert.match(page,/Burst 01/);
assert.match(page,/Burst 02/);
assert.match(page,/Resonance Liberation/);
console.log('Shorekeeper C.4: two Burst candidates, single director, pause, recovery and private conversion contract PASS');
