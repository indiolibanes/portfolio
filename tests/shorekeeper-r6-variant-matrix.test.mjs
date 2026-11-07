import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FACIAL_VARIANTS,FACIAL_VARIANT_MAP,compareFacialVariants,MOUTH_GEOMETRY_PROFILES} from '../src/scripts/shorekeeper/facial-variant-catalog.mjs';
import {R6_G113_CANDIDATES,resolveR6G113Mode} from '../src/scripts/shorekeeper/r6-g113-bridge.mjs';
import {R6_CANDIDATES} from '../src/scripts/shorekeeper/anatomical-face.mjs';

test('all five geometry modes remain explicit; R5 is only an opt-in preview recommendation',()=>{
 assert.deepEqual(MOUTH_GEOMETRY_PROFILES.map(x=>x.id),['canonical','r2','r3','r4','r5']);
 assert.equal(new Set(FACIAL_VARIANTS.map(x=>x.id)).size,FACIAL_VARIANTS.length);
 assert(FACIAL_VARIANTS.every(x=>MOUTH_GEOMETRY_PROFILES.some(g=>g.id===x.suggestedGeometry)));
 assert(!resolveR6G113Mode('?r61=1&r62=s5').enabled);
});

test('equivalent morph recipes remain different visual geometry revisions',()=>{
 for(const [a,b] of [['LITTLE_SMILE_R2_CANDIDATE','LITTLE_SMILE_R3_CANDIDATE'],['HELLO_R2_CANDIDATE','HELLO_R3_CLOSED']]){
  const c=compareFacialVariants(a,b);
  assert(c.weightsEqual&&c.timingEqual,'source recipe parity: '+a+' vs '+b);
  assert(!c.geometryEquivalent,'their suggested geometry revision differs');
 }
 const star=compareFacialVariants('MY_STAR_V2','MY_STAR_R2_CANDIDATE');
 assert.equal(star.classification,'SAME_WEIGHTS_DIFFERENT_TIMING');
 assert.notDeepEqual(FACIAL_VARIANT_MAP.MY_STAR_V2.timing,FACIAL_VARIANT_MAP.MY_STAR_R2_CANDIDATE.timing);
 for(const [a,b]of [['MY_STAR_R3_CANDIDATE','MY_STAR_R3_EYES_SOFT'],['HELLO_R3_CLOSED','HELLO_R3_OPEN'],['HELLO','HELLO_R2_CANDIDATE']])
  assert.equal(compareFacialVariants(a,b).classification,'DIFFERENT_MORPHS',a);
});

test('R6 candidates remain separately authored acting curves, not promoted aliases',()=>{
 assert.equal(R6_G113_CANDIDATES.length,8);
 for(const row of R6_G113_CANDIDATES) assert(R6_CANDIDATES[row.id]);
 assert.equal(FACIAL_VARIANTS.some(x=>x.id.endsWith('ACTING_R6')),false);
});

test('manual bridge gates geometry, versions and private Hsin duet without adding RAF or GLBs',()=>{
 const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
 const lab=read('src/scripts/shorekeeper-sk-lab.mjs');
 const page=read('src/pages/experimentos/sk/index.astro');
 const hsin=read('src/scripts/hsin-stage.ts');
 const duo=read('src/pages/experimentos/duo/index.astro');
 const guest=read('src/scripts/shorekeeper/s6-duet-guest.mjs');
 assert.match(lab,/const chosen=\['canonical','r2','r3','r4','r5'\]\.includes\(mode\)\?mode:'r5'/);
 assert.match(lab,/face\.playBaseline\(selected\.id\)/);
 assert.match(lab,/\['canonical','r2','r3','r4','r5'\]:\['canonical','r4','r5'\]/);
 assert.match(page,/data-r6-variant-select/);
 assert.match(page,/FACE_MENU_VALUES\.primary\.map/);
 assert.match(page,/data-r6-history-toggle/);
 assert.match(page,/data-r6-main-blink/);
 assert.match(page,/data-r6-only hidden/);
 assert.match(duo,/data-duo-r6-controls hidden/);
 assert.match(guest,/createAnatomicalFaceDirector\(inspection\)/);
 assert.match(guest,/createMouthR5\(model\)/);
 assert.match(guest,/mouthCorrection\?\.dispose\(\)/);
 assert.match(hsin,/experimentalR6:duetR6/);
 assert.match(hsin,/r6Guest/);
 assert.match(guest,/if\(!experimentalR6&&faceSeconds<=0/);
 assert(!/requestAnimationFrame|new WebGLRenderer|new THREE.WebGLRenderer/.test(guest),'guest owns no RAF or renderer');
});
