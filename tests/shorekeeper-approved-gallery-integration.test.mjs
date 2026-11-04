import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../src/pages/experimentos/sk/index.astro',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/scripts/shorekeeper-sk-lab.mjs',import.meta.url),'utf8');

test('approved gallery is visible without debug flags and source-whitelisted',()=>{
 assert.match(page, /data-approved-gallery open/);
 assert.match(page, /data-approved-expression=\{id\}/);
 assert.match(page, /APPROVED_MANUAL_GESTURES\.map/);
 assert.match(runtime,/face=createGentleFace\(inspection,\{qaRecipes:mouthQA\|\|facialQA\?MOUTH_QA_RECIPES:APPROVED_MANUAL_RECIPES\}\)/);
 assert.match(runtime,/isApprovedManualGesture\(id\)/);
});
test('manual activation requires canonical SHA and cannot enable scheduler',()=>{
 assert.match(runtime,/metadata\?\.sha256===SHOREKEEPER_CANONICAL\.sha256/);
 assert.match(runtime,/scheduler\?\.setEnabled\(false\)/);
 assert.match(runtime,/face\.triggerQA\(id\)/);
 assert.doesNotMatch(page,/data-approved-expression="WORRIED"/);
});
test('experimental ambient uses existing R5 director and explicit visual cues',()=>{
 assert.match(runtime,/get\('vfx'\)\?\?'r5'/);
 assert.match(runtime,/if\(vfx\?\.r5&&!mouthQA\)vfx\.setState\('AMBIENT'\)/);
 assert.match(page,/data-vfx-story/);
 assert.match(page,/data-vfx-state/);
});
