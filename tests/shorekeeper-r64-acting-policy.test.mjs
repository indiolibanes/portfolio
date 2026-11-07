import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {createNonRepeatingChoice,quietFaceWait} from '../src/scripts/shorekeeper/duet-acting-policy.mjs';
import {R6_PRIMARY_CHOICES,R6_HISTORIC_CHOICES,resolveFaceMenu} from '../src/scripts/shorekeeper/facial-unified-menu.mjs';
import {R61_SOURCE_IDS,buildR61Plan} from '../src/scripts/shorekeeper/r61-plan.mjs';
import {attachFixedDuetMoon} from '../src/scripts/shorekeeper/duet-fixed-moon.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('quiet mode randomly picks first idle and never repeats a consecutive idle',()=>{
 const values=[.99,0,.45,.2,.65,.9,.1,.8];let i=0;
 const choice=createNonRepeatingChoice(3,{random:()=>values[i++%values.length]});
 const selected=Array.from({length:60},()=>choice.next());
 assert.equal(selected[0],2,'starts with Idle 03 when random source chooses it');
 assert(selected.every(x=>x>=0&&x<3));
 for(let n=1;n<selected.length;n++)assert.notEqual(selected[n],selected[n-1]);
 assert(new Set(selected).size===3);
 assert.equal(createNonRepeatingChoice(1).next(),0);
 assert.throws(()=>createNonRepeatingChoice(0));
 assert.throws(()=>createNonRepeatingChoice(3,{random:()=>1}).next());
});

test('R5/R6 controls preserve twenty-five distinct named selections',()=>{
 const labels=[...R6_PRIMARY_CHOICES.map(x=>'r6:'+x.id),...R6_HISTORIC_CHOICES.map(x=>'baseline:'+x.id)];
 assert.equal(labels.length,25);assert.equal(new Set(labels).size,25);
 for(const id of labels)assert(resolveFaceMenu(id));
 const page=read('src/pages/experimentos/duo/index.astro'),stage=read('src/scripts/hsin-stage.ts');
 assert.match(page,/data-duo-face/);assert.match(page,/s6-face-comparatives/);
 assert(!page.includes('data-duo-r6-select'));assert(!page.includes('data-duo-r6-play'));
 assert.match(stage,/playFaceSelection/);assert.match(stage,/faceButtons/);
});

test('G11.3 is the seven-source S5 cinematic, not a continuous Y-axis turn',()=>{
 assert.equal(R61_SOURCE_IDS.length,7);
 const samples=R61_SOURCE_IDS.map(name=>({name,duration:2,tracks:[{name:'Bip001Pelvis.position'}]}));
 const plan=buildR61Plan(samples);
 assert.equal(plan.schedule.segments.length,7);
 assert(plan.cues.some(x=>x.state==='STELLAREALM'));
 assert(plan.cues.some(x=>x.state==='RESONANCE_PEAK'));
 assert.throws(()=>buildR61Plan(samples.slice(0,6)),/incomplete sources/);
 const guest=read('src/scripts/shorekeeper/s6-duet-guest.mjs');
 assert.match(guest,/createR62Integration\(T,model,g113Clips,stage/);
 assert.match(guest,/director\?\.dispose\(\);director=null/);
 assert.match(guest,/nextDirector\.start\(\)/);
 assert.match(guest,/vfx\?\.update\(elapsed,1\)/);
 assert.match(guest,/R61_SOURCE_IDS\.every/);
 assert.match(guest,/for\(const id of REQUIRED\)/);
 assert.match(guest,/if\(!s6DuoRequirements\(manifest,SHOREKEEPER_CANONICAL.sha256\)\)/);
 assert(!guest.includes('group.rotation.y'),'no looping group rotation');
 assert(!guest.includes('createDuetBasicTurn'));
 assert(!guest.includes('requestAnimationFrame('));
 assert(!guest.includes('new WebGLRenderer('));
});

test('original facial autonomy remains quiet-only while R6 QA stays manual',()=>{
 assert.equal(quietFaceWait(()=>0),5);assert.equal(quietFaceWait(()=>.999),5+.999*9);
 const guest=read('src/scripts/shorekeeper/s6-duet-guest.mjs');
 assert.match(guest,/const idleChoice=createNonRepeatingChoice/);
 assert.match(guest,/active=idleChoice\.next\(\)/);
 assert.match(guest,/if\(!confirmed&&manualFaceCooldown<=0\)/);
 assert.match(guest,/faceChoice\.next\(\)/);
 assert.match(guest,/playFaceSelection\(value\)/);
 assert(!guest.includes('face.playCandidate(row.id)'));
});

test('fixed lunar mesh stays centre of view on orbit, without covering foreground meshes',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,16/9,.03,45);
 const moon=new T.Mesh(new T.SphereGeometry(1,8,6),new T.MeshBasicMaterial());
 const halo=new T.Mesh(new T.PlaneGeometry(3,3),new T.MeshBasicMaterial({transparent:true}));
 const result=attachFixedDuetMoon(T,{scene,camera,moon,halo});
 assert.equal(result.mode,'CAMERA_LOCKED_BACKGROUND');
 assert.equal(moon.parent,camera);assert.equal(halo.visible,false);
 assert.equal(moon.material.depthTest,false);assert.equal(moon.material.depthWrite,false);
 for(const [x,y,z] of [[0,2,7],[7,5,0],[-5,2,-9]]){
  camera.position.set(x,y,z);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
  const p=moon.getWorldPosition(new T.Vector3()).project(camera);
  assert(Math.abs(p.x)<1e-6&&Math.abs(p.y)<1e-6,'moon center fixed after orbit');
 }
 const old=moon.scale.x;
 camera.aspect=.46;camera.updateProjectionMatrix();result.resize();
 assert(moon.scale.x<old,'portrait backdrop leaves a safe top strip');
 moon.geometry.dispose();moon.material.dispose();halo.geometry.dispose();halo.material.dispose();
});

test('one projected 3D architecture aligns with the single native player surface',()=>{
 const stage=read('src/scripts/hsin-stage.ts');
 const tower=read('src/scripts/hsin-music-tower.mjs');
 const duo=read('src/pages/experimentos/duo/index.astro');
 const css=read('src/styles/shorekeeper-duo.css');
 assert.match(stage,/attachFixedDuetMoon/);
 assert.match(stage,/fixedDuetMoon\?\.resize\(\)/);
 assert.match(stage,/duetMode:duetRequested/);
 assert.match(tower,/nativeRect\.left-canvasRect\.left/);
 assert.match(tower,/nativeRect\.top-canvasRect\.top/);
 assert.equal((duo.match(/<HsinSoundtrack\s*\/>/g)??[]).length,1);
 assert.match(css,/one aligned pavilion/);
 assert.match(duo,/data-duo-g113-start/);
});
