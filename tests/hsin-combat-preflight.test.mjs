import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadRig,forward} from '../scripts/lib/hsin-rig.mjs';

const bytes=readFileSync('public/assets/models/hsin/hsin-v2.0.glb');
const rig=loadRig(bytes);
const world=forward(rig);
const xyz=(name,matrix=world)=>matrix.slice(rig.bone(name)*16+12,rig.bone(name)*16+15);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

test('production identity, mesh skin and empty animation library',()=>{
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'63506b0b7a2369722e6429c3b16c5f48764ee01706d1272b4ffd69a45c5e0d2c');
  assert.equal(rig.meshes.length,9);
  assert.deepEqual(rig.json.skins.map(s=>s.joints.length),[823,498]);
  assert.ok(rig.meshes.every(m=>rig.json.nodes[m.nodeIndex].skin===0));
  assert.equal(rig.json.animations?.length ?? 0,0);
});
test('root and pelvis bindings distinguish both skins and both local spaces',()=>{
  const parent=n=>rig.json.nodes[rig.parent[rig.bone(n)]].name;
  assert.ok(rig.json.skins[1].joints.includes(rig.bone('Root')));
  assert.ok(!rig.joints.includes(rig.bone('Root')));
  assert.equal(parent('ORG-Root'),'root');
  assert.equal(parent('ORG-Bip001Pelvis'),'tweak_Bip001Pelvis');
  assert.equal(parent('DEF-Bip001Pelvis'),'ORG-Bip001');
  assert.ok(distance(xyz('ORG-Bip001Pelvis'),xyz('DEF-Bip001Pelvis'))<1e-6);
});
test('ankle reference points and planted feet survive an upper-body override',()=>{
  const altered=forward(rig,new Map([[rig.bone('ORG-Bip001UpperArmR'),[0,0,0,1]]]));
  for(const [side,x] of [['L',0.09028],['R',-0.09027]]) {
    for(const prefix of ['ORG','DEF']) {
      const name=prefix+'-Bip001Foot'+side;
      assert.ok(distance(xyz(name),[x,.107235,-.083242])<2e-6);
      assert.ok(distance(xyz(name),xyz(name,altered))<1e-9);
    }
  }
});
