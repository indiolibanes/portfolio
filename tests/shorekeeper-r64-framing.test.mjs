import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {duetFitDistance,currentDuetBounds} from '../src/scripts/shorekeeper/duet-framing.mjs';
test('duet fit encloses all 3D corners at narrow portrait, landscape and desktop azimuths',()=>{
 for(const [w,h] of [[390,844],[832,384],[1440,900],[1140,900],[390,300],[606,384]])for(const angle of [-.6,0,.6]){
  const box={width:4.3,height:2.6,depth:2.2,aspect:w/h,fov:34,azimuth:angle},d=duetFitDistance(box),camera=new T.PerspectiveCamera(box.fov,box.aspect,.03,100);
  camera.position.set(Math.sin(angle)*d,.23,Math.cos(angle)*d);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  for(const x of [-box.width/2,box.width/2])for(const y of [-box.height/2,box.height/2])for(const z of [-box.depth/2,box.depth/2]){const p=new T.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=.8800001&&Math.abs(p.y)<=.8800001);assert.ok(p.z<1);}
 }
 assert.throws(()=>duetFitDistance({width:1,height:2,aspect:0,fov:34}));
});
test('current bounds invalidate stale skinned boxes once per fit and include non-skinned clothing',()=>{
 const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshBasicMaterial());root.add(mesh);mesh.position.x=3;
 const box=currentDuetBounds(T,root);assert.equal(box.min.x,2.5);assert.equal(box.max.y,1);
 let calls=0;mesh.isSkinnedMesh=true;mesh.computeBoundingBox=()=>{calls++;mesh.boundingBox=new T.Box3(new T.Vector3(-2,-1,-1),new T.Vector3(2,1,1));};
 const next=currentDuetBounds(T,root);assert.equal(calls,1);assert.equal(next.min.x,1);mesh.geometry.dispose();mesh.material.dispose();
});
