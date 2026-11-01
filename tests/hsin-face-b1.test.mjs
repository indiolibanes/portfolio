import assert from 'node:assert/strict';
import {createFacialB1Director,SMILE_PROFILES} from '../src/scripts/hsin-face-b1.mjs';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
import {createFaceBinding,snapshotFace} from '../src/scripts/hsin-face-rig.mjs';
import {auditFacialMorphs,PASS_B_NAMES,PASS_B1_EXTRA_NAMES} from '../src/scripts/hsin-face-morph-audit.mjs';

const auditedNames=[...PASS_B_NAMES,...PASS_B1_EXTRA_NAMES];
const limits=Object.fromEntries(auditedNames.map(name=>[name,name.startsWith('P_Nose')?.04:.12]));
const parts=['M_Smile_R','M_Smile_L','M_meow_R','M_meow_L','M_Squint_R','M_Squint_L',
 'B_Cheerful_R','B_Cheerful_L','B_Up_Add_R','B_Up_Add_L','E_Smile_R','E_Smile_L',
 'E_Squint_R','E_Squint_L','P_Nose_Up','P_Nose_Down'];
const profiles=[];
for(const profile of Object.keys(SMILE_PROFILES)){
 const director=createFacialB1Director({seed:42,limits});
 assert.equal(director.testProfile(profile),true);
 assert.equal(director.testProfile(profile),false,'cannot overlap tests');
 let maximum=0;
 for(let n=0;n<60;n++){
  const s=director.step(.05,{intensity:1,enabled:true});
  maximum=Math.max(maximum,s.smileR);
  assert.ok(Object.values(s.overlays).every(v=>v>=0&&v<=1));
  assert.equal(s.diagnostic,true);
  assert.equal(s.overlays.P_Nose_Up??0,0,'nose must not leak into smile profiles');
 }
 profiles.push(maximum);
 assert.equal(director.isLab(),false);
 assert.equal(director.testMorph('not-a-morph'),false);
}
assert.ok(profiles[0]<profiles[1]&&profiles[1]<profiles[2]);
assert.ok(profiles[2]>.12,'S3 should exceed the legacy AUTOMATIC cap in laboratory');
const nose=createFacialB1Director({limits});
for(const name of ['P_Nose_Up','P_Nose_Down']){
 assert.equal(nose.testMorph(name),true);
 let peak=0;
 for(let n=0;n<60;n++){const state=nose.step(.05,{intensity:1,enabled:true});peak=Math.max(peak,state.overlays[name]??0);
  assert.equal(state.overlays[name==='P_Nose_Up'?'P_Nose_Down':'P_Nose_Up']??0,0);}
 assert.ok(peak>.04&&peak<=1,'diagnostic nasal strength is independent of auto cap');
}
const neutral=createFacialB1Director({limits});
for(let n=0;n<3000;n++){const s=neutral.step(.05,{intensity:.75,enabled:true});
 assert.equal(s.diagnostic,false);assert.equal(s.overlays.P_Nose_Up??0,0);assert.equal(s.overlays.P_Nose_Down??0,0);
 assert.ok(s.smileR<=.12+1e-9,'automatic B.1 is still conservative');
}
// Full diagnostic weights may be applied only by B.1 isolated states.
// A and B use their original caps and baseline snapshot must restore bit-for-bit.
const mesh={morphTargetDictionary:Object.fromEntries(parts.map((n,i)=>[n,i])),
 morphTargetInfluences:parts.map((_,i)=>i===0?.13:.09)};
const baseline=snapshotFace([mesh]);
const adapter=createFaceBinding([mesh],baseline,{ready:false,directions:{}},{limits});
const face=createFacialActing({pass:'b1',seed:21,morphLimits:limits,intensity:1,
 enabled:{blink:false,wink:false,gaze:false}});
assert.equal(face.testSmileProfile('S3'),true);
let state=null;
for(let n=0;n<20;n++){state=face.advance(.05);adapter.apply(state);}
assert.equal(state.policy,'b1');assert.equal(state.diagnostic,true);
assert.ok(mesh.morphTargetInfluences[0]>.13+.87*.12);
assert.ok(mesh.morphTargetInfluences.every(v=>v>=0&&v<=1));
const candidate=[...mesh.morphTargetInfluences];
adapter.apply({...state,policy:'b',diagnostic:false});
assert.ok(mesh.morphTargetInfluences[0]<=.13+.87*.12+1e-9);
adapter.apply(state);assert.deepEqual(mesh.morphTargetInfluences,candidate);
adapter.restore();assert.deepEqual(mesh.morphTargetInfluences,baseline.get(mesh));
assert.equal(face.testSmileProfile('INVALID'),false);
const a=createFacialActing({seed:5,pass:'a'}),b=createFacialActing({seed:5,pass:'b',intensity:0});
for(let n=0;n<1000;n++)assert.deepEqual(a.advance(.05),b.advance(.05));
assert.equal(a.testSmileProfile('S1'),false);
const regular=auditFacialMorphs({},[],null,{});
const extended=auditFacialMorphs({},[],null,{},{includeB1:true});
assert.equal(regular.rows.length,12);assert.equal(extended.rows.length,16);
assert.deepEqual(extended.rows.map(r=>r.name).slice(-4),PASS_B1_EXTRA_NAMES);
console.log('Facial B.1: S1/S2/S3, explicit nasal tests, isolated full-range limits, A/B regression, restore PASS');
