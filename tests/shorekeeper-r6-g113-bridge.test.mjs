import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {R6_G113_CANDIDATES,resolveR6G113Mode,canUseR6G113} from '../src/scripts/shorekeeper/r6-g113-bridge.mjs';
import {createAnatomicalFaceDirector,R6_CANDIDATES} from '../src/scripts/shorekeeper/anatomical-face.mjs';
import {SHOREKEEPER_CANONICAL} from '../src/scripts/shorekeeper/private-model-cache.mjs';

test('R6 manual bridge requires G11.3/S5 and does not authorize G7',()=>{
 assert.deepEqual({...resolveR6G113Mode('?r61=1&r62=s5&r6Stage=1')},
  {requested:true,s5:true,enabled:true,g7AutonomyAllowed:false});
 for(const q of ['','?r6Stage=1','?r61=1&r6Stage=1','?r61=1&r62=s5','?r61=1&r62=s4&r6Stage=1'])
  assert.equal(resolveR6G113Mode(q).enabled,false,q);
 const base={enabled:true,canonical:true,model:true,loading:false,contextLost:false,paused:false,inspect:true,presentation:'contemplation',acting:'expressive',combat:false};
 assert.equal(canUseR6G113(base),true);
 for(const [key,value] of Object.entries({canonical:false,model:false,loading:true,contextLost:true,paused:true,inspect:false,presentation:'combat',acting:'reference',combat:true}))
  assert.equal(canUseR6G113({...base,[key]:value}),false,key);
});

test('eight distinct candidates remain manual and R6 body handoff returns to neutral',()=>{
 const source=JSON.parse(readFileSync(new URL('../docs/characters/shorekeeper-r6-baseline-golden.json',import.meta.url)));
 const morphMeshes=source.meshes.map(m=>({...m,morphTargetInfluences:new Array(Object.keys(m.morphTargetDictionary).length).fill(0)}));
 const inspection={morphMeshes,names:morphMeshes.flatMap(m=>Object.keys(m.morphTargetDictionary)),weights:{}};
 const f=createAnatomicalFaceDirector(inspection);
 assert.equal(R6_G113_CANDIDATES.length,8);
 assert.equal(new Set(R6_G113_CANDIDATES.map(x=>x.id)).size,8);
 for(const row of R6_G113_CANDIDATES){assert.ok(R6_CANDIDATES[row.id],row.id);assert.equal(f.playCandidate(row.id),true,row.id);f.seek(1.6);assert.ok(Object.values(f.report().weights).every(x=>Number.isFinite(x)&&x>=0&&x<=1));}
 f.playCandidate('MY_STAR_ACTING_R6');f.advance(.5);
 f.onAnimationEvent({type:'start',clip:'SK_COMBO_EXPERIMENTAL'});
 assert.equal(f.playCandidate('SERENITY_ACTING_R6'),false,'no manual emotion during cinematic combat');
 f.onAnimationEvent({type:'end',clip:'SK_COMBO_EXPERIMENTAL'});
 assert.equal(f.playCandidate('SERENITY_ACTING_R6'),true,'face released after cinematic');
 f.reset();assert.ok(morphMeshes.every(m=>m.morphTargetInfluences.every(v=>v===0)));
 f.dispose();
});

test('bridge is isolated from GLB/R2, automatic G7 and production defaults',()=>{
 assert.equal(SHOREKEEPER_CANONICAL.sha256,'4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30');
 const runtime=readFileSync(new URL('../src/scripts/shorekeeper-sk-lab.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/pages/experimentos/sk/index.astro',import.meta.url),'utf8');
 assert.match(runtime,/const r6Active=facialR6\|\|r6Stage/);
 assert.match(runtime,/const r6Module=r6Active\?await import/);
 assert.match(runtime,/r62Enabled&&!r6Active&&!mouthQA/);
 assert.match(runtime,/scheduler\?\.setEnabled\(!r6Active&&/);
 assert.match(runtime,/face\?\.onAnimationEvent\(e\)/);
 assert.match(runtime,/face\?\.advance\(dt,\{writeFacial:/);
 assert.match(runtime,/createR62Integration/);
 assert.match(ui,/data-r6-variant-button/);
 assert.match(ui,/data-r6-face-comparatives/);
 assert(!ui.includes('data-r6-variant-select'));
 assert.match(ui,/data-r6-g113-neutral/);
 assert.match(ui,/G7 permanece NO_GO/);
 assert(!/\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/.test(readFileSync(new URL('../src/scripts/shorekeeper/r6-g113-bridge.mjs',import.meta.url),'utf8')));
});
