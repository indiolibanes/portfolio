import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createArmClearanceAudit} from '../src/scripts/hsin-arm-clearance.mjs';
const v=(...args)=>new THREE.Vector3(...args);
function mesh(name,kind,depth){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,1,-1,0,0,1,0,.02,.02,depth],3));
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([kind,0,0,0,kind,0,0,0,kind,0,0,0,2,0,0,0],4));
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],4));g.setIndex([0,1,2]);
 return {geometry:g,material:{name},matrixWorld:new THREE.Matrix4(),skeleton:{bones:[{name:'ORG-Bip001Spine2'},{name:'DEF-Bip001UpperArmL'},{name:'DEF-Bip001ForearmL001'}],update(){}},updateWorldMatrix(){},getVertexPosition(i,p){return p.fromBufferAttribute(g.getAttribute('position'),i)}};
}
const body=mesh('Up Xin',0,-.03),sleeve=mesh('Cloth Xin',1,0);
const audit=createArmClearanceAudit({THREE,meshes:[body,sleeve],side:'L',origin:v(),outward:v(1,0,0),up:v(0,1,0),forward:v(0,0,1),scale:.1});
let result=audit.check();assert.equal(result.torso.violations,1);assert.equal(result.sleeve.violations,1);
body.geometry.getAttribute('position').setZ(3,.04);result=audit.check();assert.equal(result.torso.violations,0);assert.equal(result.sleeve.violations,0);assert.ok(result.torso.tested>0&&result.sleeve.tested>0);
const before=body.geometry.getAttribute('position').array.slice();audit.check();assert.deepEqual(body.geometry.getAttribute('position').array,before,'audit must never change mesh geometry');
console.log('Arm envelope: torso and sleeve rejection, positive clearance and immutable geometry PASS');
