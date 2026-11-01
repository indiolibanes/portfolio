import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHairPose} from '../src/scripts/hsin-hair-gesture.mjs';
import {createArmClearanceAudit} from '../src/scripts/hsin-arm-clearance.mjs';
import {createHandClearance,sampleHandSurface} from '../src/scripts/hsin-hand-clearance.mjs';
const incomplete=createHairPose({THREE,bones:[],meshes:[],head:null,calibration:{ready:false}});
assert.equal(incomplete.diagnostics().ready,false);assert.equal(incomplete.apply(1),false);incomplete.restore();
const mesh=(name,depth)=>{
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,1,-1,0,0,1,0,0,0,depth],3));g.setIndex([0,1,2]);g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],4));
 return {geometry:g,material:{name},matrixWorld:new THREE.Matrix4(),skeleton:{bones:[{name:'ORG-Bip001Head'},{name:'ORG-Bip001HandL'}],update(){}},updateWorldMatrix(){},getVertexPosition(i,p){return p.fromBufferAttribute(g.getAttribute('position'),i)}};
};
const body=mesh('Up Xin',-.03),hair=mesh('Hair Xin',0),face=mesh('Face Xin',0);
const args={THREE,meshes:[body,hair,face],side:'L',origin:new THREE.Vector3(),outward:new THREE.Vector3(1,0,0),up:new THREE.Vector3(0,1,0),forward:new THREE.Vector3(0,0,1),scale:.1,includeHead:true};
const audit=createArmClearanceAudit(args);let r=audit.check();assert.ok(r.hair.violations>0&&r.head.violations>0,'hair and head envelope are active');
body.geometry.getAttribute('position').setZ(3,.05);r=audit.check();assert.equal(r.hair.violations,0);assert.equal(r.head.violations,0);
assert.equal(sampleHandSurface({THREE,meshes:[body],side:'R'}).length,0);assert.equal(sampleHandSurface({THREE,meshes:[body],side:'L'}).length,1);
const guard=createHandClearance({points:[[0,0,0],[.02,.01,0]],scale:.06});assert.equal(guard.check([[.001,0,0]]).tooClose,true);assert.equal(guard.check([[.03,.03,.03]]).tooClose,false);assert.equal(guard.check([]).covered,false);
console.log('Hair/hand safeguards: unavailable rig refuses playback, head/hair intrusion rejected, real side-specific skin sampling and hand gaps PASS');
const {createSleeveIntersectionAudit}=await import('../src/scripts/hsin-sleeve-intersections.mjs');
function triangle(name,bone,positions){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex([0,1,2]);g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0],4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
 return {geometry:g,material:{name},matrixWorld:new THREE.Matrix4(),skeleton:{bones:[{name:bone}],update(){}},updateWorldMatrix(){},getVertexPosition(i,p){return p.fromBufferAttribute(g.getAttribute('position'),i)}};
}
const sleeve=triangle('Cloth Xin','DEF-Bip001UpperArmL',[-1,-1,0,1,-1,0,0,1,0]);
const skin=triangle('Up Xin','DEF-Bip001ForearmL',[-.2,-.2,-.1,.2,-.2,.1,0,.3,.1]);
const surface=createSleeveIntersectionAudit({THREE,meshes:[skin,sleeve],side:'L',scale:1});assert.ok(surface.check().intersections>0,'true skin/cloth crossing is rejected');
for(let i=0;i<3;i++)skin.geometry.getAttribute('position').setZ(i,-.1);assert.equal(surface.check().intersections,0,'occluded skin without a surface crossing is permitted');assert.equal(surface.check().covered,true);
console.log('Sleeve surfaces: true 3D crossing rejected, projection-only occlusion accepted PASS');
