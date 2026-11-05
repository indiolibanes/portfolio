import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {ShorekeeperVfxR5Director} from '../src/scripts/shorekeeper/vfx-r5.mjs';
import {ShorekeeperVfxR2Director} from '../src/scripts/shorekeeper/vfx-r2.mjs';
import {setSourceReviewVfxIsolation} from '../src/scripts/shorekeeper/source-review-visuals.mjs';

test('source-only inspection hides BOTH R5 VFX and celestial environment, restores on exit',()=>{
 const scene=new T.Scene(),vfx=new ShorekeeperVfxR5Director(scene,{mobile:true,butterflies:3});
 try{
  vfx.setState('OFF');vfx.update(.2,1);
  assert.equal(vfx.root.visible,true,'R5 keeps stars visible in normal OFF state');
  assert.equal(vfx.environment.root.visible,true,'sky is a distinct scene subtree');
  assert.equal(setSourceReviewVfxIsolation(vfx,true),true);
  assert.equal(vfx.root.visible,false);
  assert.equal(vfx.environment.root.visible,false);
  assert.equal(setSourceReviewVfxIsolation(vfx,true),true,'repeated QA frame keeps isolation');
  assert.equal(setSourceReviewVfxIsolation(vfx,false),true);
  assert.equal(vfx.environment.root.visible,true,'normal R5 sky restored');
  assert.equal(vfx.root.visible,true,'normal R5 authored visibility restored');
  assert.equal(setSourceReviewVfxIsolation(vfx,false),false,'reentrant restore is harmless');
 }finally{vfx.dispose();}
});

test('source-only inspection also hides R2 effects without a celestial environment',()=>{
 const vfx=new ShorekeeperVfxR2Director(new T.Scene(),{butterflies:2});
 try{
  vfx.setState('STELLAREALM');vfx.update(.5,1);
  assert.equal(vfx.root.visible,true);
  setSourceReviewVfxIsolation(vfx,true);
  assert.equal(vfx.root.visible,false);
  setSourceReviewVfxIsolation(vfx,false);
  assert.equal(vfx.root.visible,true,'current VFX state remains untouched');
  assert.equal(vfx.state,'STELLAREALM','visual isolation must not rewrite canonical state');
 }finally{vfx.dispose();}
});

test('sourceQA is insulated across frame updates, VFX profile replacement and release',()=>{
 const source=readFileSync(new URL('../src/scripts/shorekeeper-sk-lab.mjs',import.meta.url),'utf8');
 assert.match(source,/director\.start\(\);setSourceReviewVfxIsolation\(vfx,true\)/);
 assert.match(source,/const sourceIsolated=director\?\.state\.mode==='SOURCE_REVIEW'/);
 assert.match(source,/vfx\?\.setSuspended\(vfxPaused\|\|userPaused\|\|sourceIsolated\)/);
 assert.match(source,/if\(sourceIsolated\)setSourceReviewVfxIsolation\(vfx,true\)/);
 assert.match(source,/narrative:!sourceIsolated/);
 assert.match(source,/vfx:!sourceIsolated/);
 assert.match(source,/setSourceReviewVfxIsolation\(vfx,false\);vfx\?\.bindModel\(null\)/);
 assert.match(source,/if\(director\?\.state\.mode==='SOURCE_REVIEW'\)setSourceReviewVfxIsolation\(vfx,true\)/);
});
