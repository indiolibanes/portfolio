import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {make} from './shorekeeper-r65-fixture.mjs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('approved G11.3 intelligent camera frames only Shorekeeper',()=>{
 const guest=src('src/scripts/shorekeeper/s6-duet-guest.mjs');
 assert.match(guest,/cameraProfile:\{smart:true\}/);
 assert(!guest.includes('createDuetCinematicFrame'));
 assert.match(guest,/setCameraPreference\(mode\)/);
 assert.match(guest,/g113\.resumeCamera\(\)/);
 assert.match(guest,/g113\.stopCamera\(\{preserve:true\}\)/);
});
test('manual camera takeover preserves last camera shot while G11.3 body keeps advancing',()=>{
 const f=make(),d=f.create({camera:true,entry:.65,preservePoseOnDispose:true,cameraProfile:{smart:true}});
 try{
  d.start();assert.equal(d.state.cameraActive,true);assert.equal(f.stage.orbit.enabled,false);
  d.advance(.4);const clock=d.state.clock,cameraPos=f.stage.camera.position.clone();
  d.stopCamera({preserve:true});assert.equal(d.state.cameraActive,false);
  assert.equal(f.stage.orbit.enabled,true);
  assert(cameraPos.distanceTo(f.stage.camera.position)<1e-7);
  d.advance(.4);assert(d.state.clock>clock,'music and body timeline continue during manual camera');
  assert.equal(d.resumeCamera(),true);assert.equal(d.state.cameraActive,true);
  d.stopCamera({preserve:true});assert.equal(d.state.cameraActive,false);
 }finally{d.dispose();f.dispose();}
});
test('single duet camera supports pointer zoom, camera modes and future disabled slots',()=>{
 const stage=src('src/scripts/hsin-stage.ts'),html=src('src/pages/experimentos/duo/index.astro');
 assert.match(stage,/orbit\.zoomToCursor=duetRequested/);
 assert.match(stage,/orbit\.enablePan=duetRequested/);
 assert.match(stage,/canvas\.addEventListener\('wheel',releaseShotForGesture,\{capture:true/);
 assert.match(stage,/canvas\.addEventListener\('pointerdown',releaseShotForGesture,\{capture:true/);
 assert.match(stage,/if\(!duetRequested\)\{const height=attentionHeight/);
 assert.match(stage,/chooseDuetCamera=\(mode:string\)=>/);
 assert.match(stage,/followCameraTarget\(\)/);
 assert.equal((html.match(/data-stage-canvas/g)??[]).length,1);
 assert.equal((html.match(/<HsinSoundtrack\s*\/>/g)??[]).length,1);
 for(const id of ['auto','free','hsin','shorekeeper','phrolova','sophia'])
  assert(html.includes('value="'+id+'"'));
 assert.match(html,/value="phrolova" disabled/);
 assert.match(html,/value="sophia" disabled/);
});
