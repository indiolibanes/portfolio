import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {ADVANCED_COMBAT_IDS,COMBAT_CLIP_IDS,ORIGINAL_ATTACK_IDS,validateCombatLibrary,createCombatDirector} from '../src/scripts/shorekeeper/combat-director.mjs';

assert.deepEqual(ORIGINAL_ATTACK_IDS,[
 'SK_ATTACK_01_ORIGINAL','SK_ATTACK_02_ORIGINAL','SK_ATTACK_03_ORIGINAL','SK_ATTACK_04_ORIGINAL'
]);
assert.deepEqual(ADVANCED_COMBAT_IDS,[
 'SK_ATTACK_L02_ORIGINAL','SK_SKILL_01_ORIGINAL','SK_SKILL_QTE_01_ORIGINAL','SK_AIR_SKILL_01_ORIGINAL'
]);
assert(COMBAT_CLIP_IDS.length>=8,'C.3 attack IDs remain available in future phases');
assert(COMBAT_CLIP_IDS.length===new Set(COMBAT_CLIP_IDS).size,'No duplicate combat identifiers');
for(const id of [...ORIGINAL_ATTACK_IDS,...ADVANCED_COMBAT_IDS])assert(COMBAT_CLIP_IDS.includes(id),'C.3 movement must remain: '+id);
const root=new T.Group(),bone=new T.Bone();bone.name='Root';root.add(bone);
const clipFor=(name)=>new T.AnimationClip(name,.75,[new T.VectorKeyframeTrack('Root.position',[0,.75],[0,0,0,.5,0,0])]);
for(const id of ADVANCED_COMBAT_IDS){
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
assert.throws(()=>validateCombatLibrary(T,root,{json:{asset:{extras:{skCombatLibrary:'2.1-c'}}},gltf:{animations:[new T.AnimationClip(ADVANCED_COMBAT_IDS[0],1,[foreign])]}}),/Canal corporal/);
const page=await readFile('src/pages/experimentos/sk/index.astro','utf8');
const runtime=await readFile('src/scripts/shorekeeper-sk-lab.mjs','utf8');
const converter=await readFile('scripts/shorekeeper/convert-advanced-combat.py','utf8');
for(const id of ADVANCED_COMBAT_IDS)assert(page.includes('value="'+id+'"'),'Advanced move absent from select: '+id);
assert.match(runtime,/COMBAT_CLIP_IDS/);
assert.match(runtime,/director\?\.advance\(dt\)/);
assert(!runtime.includes('combatDirector.advance'),'No second render-loop combat director');
assert.match(converter,/shorekeeper-advanced-combat-preflight\/1/);
assert.match(converter,/Private output must be outside repository/);
assert.match(converter,/Ambiguous animated ownership/);
assert.match(page,/Habilidade aérea 01/);
console.log('Shorekeeper C.3: four advanced combat clips, single owner, pause, recovery, controls and private conversion contract PASS');
