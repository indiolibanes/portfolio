import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {g113InterludeSeconds} from '../src/scripts/shorekeeper/duet-acting-policy.mjs';
import {createLunarTerrace,DUET_TERRACE} from '../src/scripts/hsin-lunar-terrace.mjs';
import {attachFixedDuetMoon} from '../src/scripts/shorekeeper/duet-fixed-moon.mjs';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('G11.3 interludes take 5-8 seconds and stop counting during paused music',()=>{
 assert.equal(g113InterludeSeconds(()=>0),5);
 assert.equal(g113InterludeSeconds(()=>.5),6.5);
 assert(g113InterludeSeconds(()=>.999999)>7.99);
 assert(g113InterludeSeconds(()=>.999999)<8);
 for(const r of [-1,1,Infinity,NaN])assert.throws(()=>g113InterludeSeconds(()=>r));
 const guest=src('src/scripts/shorekeeper/s6-duet-guest.mjs');
 assert.match(guest,/g113Cooldown=g113InterludeSeconds\(\)/);
 assert.match(guest,/faceSeconds=Math\.min\(faceSeconds,/);
 assert.match(guest,/const contemplativeInterlude=confirmed&&g113Cooldown>0/);
 assert.match(guest,/if\(\(!confirmed\|\|contemplativeInterlude\)&&manualFaceCooldown<=0\)/);
 assert.match(guest,/if\(confirmed\)g113Cooldown=Math\.max\(0,g113Cooldown-elapsed\)/);
 assert.match(guest,/if\(confirmed&&g113Cooldown<=0&&!g113Attempted&&!g113Loading\)/);
 assert(!guest.includes('g113Cooldown=2;'));
});

test('duet-only paving expands from 22x14 to 36x24 without changing solo terrace',()=>{
 const texture=()=>new T.Texture();
 const assets={THREE:T,skyTexture:texture(),moonTexture:texture(),stoneTexture:texture(),atlasTexture:texture(),waterTexture:texture()};
 const solo=createLunarTerrace({...assets});
 const duet=createLunarTerrace({...assets,duetArena:true});
 try{
  const soloFloor=solo.group.getObjectByName('Continuous stone terrace');
  const duetFloor=duet.group.getObjectByName('Continuous stone terrace');
  assert.equal(soloFloor.geometry.parameters.width,22);
  assert.equal(soloFloor.geometry.parameters.height,14);
  assert.equal(soloFloor.position.z,3);
  assert.equal(duetFloor.geometry.parameters.width,DUET_TERRACE.width);
  assert.equal(duetFloor.geometry.parameters.height,DUET_TERRACE.depth);
  duetFloor.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(duetFloor);
  assert(Math.abs(b.min.x+18)<.001);
  assert(Math.abs(b.max.x-18)<.001);
  assert(Math.abs(b.min.z-DUET_TERRACE.rearEdge)<.001);
  assert(Math.abs(b.max.z-16)<.001);
  assert(DUET_TERRACE.railZ>DUET_TERRACE.rearEdge);
  const stage=src('src/scripts/hsin-stage.ts');
  assert.match(stage,/duetArena:duetRequested/);
 }finally{
  for(const obj of [solo.group,duet.group])obj.traverse(x=>{x.geometry?.dispose();x.material?.dispose?.()});
  for(const t of Object.values(assets))if(t?.isTexture)t.dispose();
 }
});

test('centred moon occupies under 60% of viewport height while staying elevated',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,16/9,.03,45);
 const moon=new T.Mesh(new T.SphereGeometry(1,8,6),new T.MeshBasicMaterial());
 const halo=new T.Mesh(new T.PlaneGeometry(3,3),new T.MeshBasicMaterial({transparent:true}));
 const lock=attachFixedDuetMoon(T,{scene,camera,moon,halo});
 for(const aspect of [16/9,832/384,390/844]){
  camera.aspect=aspect;camera.updateProjectionMatrix();lock.resize();camera.updateMatrixWorld(true);
  const halfHeight=lock.depth*Math.tan(camera.fov*Math.PI/360);
  const coverage=moon.scale.x/halfHeight;
  assert(coverage<.6,'moon must not cover most of the screen: '+coverage);
  assert(coverage>.4);
  const centre=moon.getWorldPosition(new T.Vector3()).project(camera);
  assert(Math.abs(centre.x)<1e-6);
  assert(Math.abs(centre.y-.46)<1e-6);
 }
 moon.geometry.dispose();moon.material.dispose();halo.geometry.dispose();halo.material.dispose();
});
