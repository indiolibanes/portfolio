import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {R5_FACE_BUTTON_GROUPS,R5_FACE_BUTTON_COUNT,R5_FACE_ARCHIVED_IDENTICAL,R5_RECIPE_EQUIVALENCES,resolveFaceMenu} from '../src/scripts/shorekeeper/facial-unified-menu.mjs';
import {compareFacialVariants,FACIAL_VARIANTS} from '../src/scripts/shorekeeper/facial-variant-catalog.mjs';
import {createLunarMoon} from '../src/scripts/hsin-lunar-moon.mjs';
import {R6_CANDIDATES} from '../src/scripts/shorekeeper/anatomical-face.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('R5 manual panel has 23 direct buttons while retaining distinct intermediates',()=>{
 assert.equal(R5_FACE_BUTTON_COUNT,23);
 assert.deepEqual(R5_FACE_BUTTON_GROUPS.map(g=>g.choices.length),[9,7,7]);
 assert.equal(R5_FACE_ARCHIVED_IDENTICAL.length,2);
 assert.equal(FACIAL_VARIANTS.length,16);
 for(const pair of R5_RECIPE_EQUIVALENCES){
  const comparison=compareFacialVariants(pair.archived,pair.representedBy);
  assert(comparison.weightsEqual&&comparison.timingEqual,'same recipe and timing necessary to archive from R5-only panel');
 }
 const displayed=new Set(R5_FACE_BUTTON_GROUPS.flatMap(g=>g.choices.map(x=>x.value)));
 assert.equal(displayed.size,23,'no duplicated action buttons');
 for(const key of ['MY_STAR_V2','MY_STAR_R2_CANDIDATE','MY_STAR_R3_EYES_SOFT','HELLO_R3_OPEN','HELLO','SURPRISE_SOFT'])
  assert(displayed.has('baseline:'+key),'distinct historically meaningful facial state retained: '+key);
 assert(displayed.has('r6:EYES_WIDE_ACTING_R6'));
 assert(R6_CANDIDATES.EYES_WIDE_ACTING_R6);
 assert.equal(resolveFaceMenu('baseline:LITTLE_SMILE_R3_CANDIDATE')?.kind,'baseline','hidden QA recipe not deleted');
});
test('visible page has direct R5/R6 buttons, no combobox or duplicate facial panels in R6 mode',()=>{
 const page=read('src/pages/experimentos/sk/index.astro');
 const runtime=read('src/scripts/shorekeeper-sk-lab.mjs');
 assert.match(page,/data-r65-face=\{v\.value\}/);
 assert.match(page,/R5 · contorno \| R6 · atuação/);
 assert(!page.includes('data-r6-variant-select'));
 assert(!page.includes('data-r6-history-toggle'));
 assert.match(page,/data-r6-mouth-details hidden/);
 assert.match(runtime,/\?mode:'r5'/);
 assert.match(runtime,/legacyQA/);
 assert.match(runtime,/playR65Selection/);
 assert.match(runtime,/face\.playCandidate\(selected\.id\):face\.playBaseline\(selected\.id\)/);
 assert.match(runtime,/\['\[data-approved-gallery\]','\[data-facial-qa\]','\.sk-expressions','\.sk-face-guide'\]/);
});
test('duet-only enlarged lunar sphere is dimmed; default solo still has unit luminance',()=>{
 const moon=createLunarMoon(T,new T.Texture(),1.35);
 assert.equal(moon.material.uniforms.lunarBrightness.value,1);
 const stage=read('src/scripts/hsin-stage.ts');
 const tower=read('src/scripts/hsin-music-tower.mjs');
 assert.match(stage,/if\(duetRequested\)\{[\s\S]*?moon\.scale\.setScalar\(2\.05\)/);
 assert.match(stage,/lunarBrightness\.value=\.69/);
 assert.match(stage,/halo\.material\.opacity=\.12/);
 assert.match(stage,/if\(musicElement\)\{musicTower=createMusicTower/);
 assert.match(stage,/duetMode:duetRequested/);
 assert.match(tower,/if\(duetMode\)\{/);
 assert.match(tower,/const paneW=Math\.max\(90,Math\.min\(155,w\*\.23\)\)/);
 assert(!/requestAnimationFrame|new WebGLRenderer|setInterval/.test(tower),'music pavilion has no own render loop');
 moon.geometry.dispose();moon.material.dispose();
});
