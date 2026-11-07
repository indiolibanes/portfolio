import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const h=await readFile('src/scripts/hsin-stage.ts','utf8');
const source=await readFile('src/pages/experimentos/duo/index.astro','utf8');
const solo=await readFile('src/pages/experimentos/index.astro','utf8');
test('S6 private duet has one Hsin stage, uses original renderer and existing frame step',()=>{
 assert.match(source,/data-hsin-stage data-s6-duo="true"/);
 assert.match(source,/HsinStageLayout/);
 assert.match(h,/duetGuest\.advance\(dt/);
 assert.match(h,/loadS6DuetGuest\(T,scene,\{signal:attempt\.signal,experimentalR6:duetR6,preparation:prepared,hostModel:model,camera,lowPower:touch,traceEnabled:metrics\.enabled/);
 assert.match(h,/cameraStage:\{scene,camera,orbit,canvas/);
 assert.match(h,/const duetR6=duetRequested&&\(publicRelease\|\|new URLSearchParams\(location\.search\)\.get\('r6Guest'\)==='1'\)/);
 assert.match(h,/if\(duetControls\)duetControls\.hidden=!duetR6/);
 assert.match(h,/duetGuest\?\.dispose\(\)/);
 assert.match(h,/const duetRequested=root\.dataset\.s6Duo==='true'/);
 assert.equal(source.match(/data-stage-canvas/g).length,1);
 assert.ok(!source.includes('shorekeeper-f20a.glb'));
});
test('S6 private duet does not change Hsin default public route or expose source assets',()=>{
 assert.ok(!solo.includes('data-s6-duo'));
 assert.ok(!solo.includes('s6-duet-guest'));
 assert.ok(source.includes('Private Duet Preview'));
 assert.ok(!source.includes('window.__'));
});
