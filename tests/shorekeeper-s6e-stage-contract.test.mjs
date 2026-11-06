import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
const guest=await readFile('src/scripts/shorekeeper/s6-duet-guest.mjs','utf8');
const stage=await readFile('src/scripts/hsin-stage.ts','utf8');
const solo=await readFile('src/pages/experimentos/index.astro','utf8');
const route=await readFile('src/pages/experimentos/duo/index.astro','utf8');

test('S6-E integrates R6 facial engine and retains approved historical archive',()=>{
 assert.match(guest,/createAnatomicalFaceDirector/);
 assert.match(guest,/APPROVED_MANUAL_RECIPES/);
 assert.match(guest,/playS6Expression/);
 assert.match(guest,/S6_EXPRESSION_FAMILIES/);
 assert.doesNotMatch(guest,/createGentleFace\(/);
});
test('S6-E music must be actual provider playback and uses original G11.3 pipeline',()=>{
 assert.match(guest,/createS6DuoChoreographer/);
 assert.match(guest,/createR62Integration/);
 assert.match(guest,/ShorekeeperVfxR5Director/);
 assert.match(guest,/camera:false/);
 assert.match(guest,/bodyStability:'off'/);
 assert.match(guest,/R61_SOURCE_IDS/);
 assert.match(guest,/summarizePrivateCombat\(manifest,loaded\)\.allLoaded/);
 assert.match(stage,/music:music\.sample\(\)/);
 assert.match(stage,/duetGuest\.advance\(dt/);
});
test('Hsin remains one renderer and one RAF; solo route unchanged',()=>{
 assert.match(stage,/duoStageAdapter/);
 assert.match(stage,/scene,camera,orbit,canvas,renderer/);
 assert.match(stage,/duetGuest\?\.dispose\(\)/);
 assert.doesNotMatch(solo,/data-s6-duo/);
 assert.match(route,/data-s6-duo="true"/);
 assert.match(route,/Private Duet/);
});
