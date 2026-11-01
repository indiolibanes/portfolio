import assert from 'node:assert/strict';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
import {createFaceBinding,snapshotFace} from '../src/scripts/hsin-face-rig.mjs';
import {PASS_B_NAMES,PASS_B1_EXTRA_NAMES} from '../src/scripts/hsin-face-morph-audit.mjs';
import {ICONIC_PROFILES} from '../src/scripts/hsin-iconic-profiles.mjs';
import {createFacialB1Director} from '../src/scripts/hsin-face-b1.mjs';
const all=[...PASS_B_NAMES,...PASS_B1_EXTRA_NAMES],limits=Object.fromEntries(all.map(n=>[n,.12]));
const trace=(seed)=>{const face=createFacialActing({pass:'auto-b1',seed,intensity:.75,morphLimits:limits});let prev='',wink='',count=0,coyWinks=0,peaks=new Map();const seq=[];
 for(let i=0;i<72000;i++){if(i%1500===0)face.attention([.9,0,0],2);const state=face.advance(1/60),diag=face.diagnostics(),p=diag.expressions.profile;
 if(prev!==p){assert.notEqual(prev,p);seq.push([p,diag.expressions.context]);prev=p;}
 peaks.set(p,Math.max(peaks.get(p)??0,state.smileR));assert.equal(state.overlays.P_Nose_Up??0,0);assert.equal(state.overlays.P_Nose_Down??0,0);
 if(state.event?.startsWith('wink')&&state.event!==wink){if(wink)assert.notEqual(wink,state.event,'automatic winks alternate');wink=state.event;count++;if(diag.event?.origin==='expression'&&diag.expressions.context==='Coy Response')coyWinks++;}if(state.event==='wink')assert.equal(state.closeL,0);if(state.event==='wink-left')assert.equal(state.closeR,0);
 }
 assert.ok(count>10);assert.ok(coyWinks>0,'Coy response should occasionally request a wink');assert.ok(seq.length>30);for(const key of ['S1','S2','S3'])assert.ok(seq.some(v=>v[0]===key),key);assert.ok(seq.some(v=>v[1]==='Curious Attention'));assert.ok(seq.some(v=>v[1]==='Warm Presence'));assert.ok(Math.max(...peaks.values())>.2,'B.1 automatic smile exceeds B cap');return seq;};
assert.deepEqual(trace(12),trace(12));assert.notDeepEqual(trace(12),trace(13));
for(const profile of Object.keys(ICONIC_PROFILES)){const d=createFacialB1Director({limits});assert.equal(d.testProfile(profile,1),true);let observed=false;for(let i=0;i<50;i++){const s=d.step(.05,{intensity:1,enabled:true});if(s.smileR>0)observed=true;assert.equal(s.overlays.P_Nose_Up??0,0)}assert.ok(observed);}
const parts=['M_Smile_R','M_Smile_L',...all],unique=[...new Set(parts)],mesh={morphTargetDictionary:Object.fromEntries(unique.map((n,i)=>[n,i])),morphTargetInfluences:unique.map(()=>.07)},snapshot=snapshotFace([mesh]);
const binding=createFaceBinding([mesh],snapshot,{ready:false,directions:{}},{limits}),face=createFacialActing({pass:'auto-b1',seed:12,morphLimits:limits,intensity:1,enabled:{blink:false,wink:false}});
let peak=0;for(let i=0;i<1800;i++){const s=face.advance(1/60);binding.apply(s);peak=Math.max(peak,mesh.morphTargetInfluences[mesh.morphTargetDictionary.M_Smile_R]);}assert.ok(peak>.2);binding.restore();assert.deepEqual(mesh.morphTargetInfluences,snapshot.get(mesh));
console.log('B.1 automation: context selection, S1–S3, I1–I5 tests, wink alternation, one composer, exact restore PASS');

const {createAutoB1Director}=await import('../src/scripts/hsin-iconic-expressions.mjs');
const bodyFace=createAutoB1Director({seed:77,limits});bodyFace.step(.1,{enabled:true,intensity:.75});bodyFace.signal('gesture:prepare');assert.equal(bodyFace.diagnostics().context,'Warm Presence');const warmProfile=bodyFace.diagnostics().profile;bodyFace.signal('gesture:hold');assert.equal(bodyFace.diagnostics().profile,warmProfile,'hold must not restart the warm expression');bodyFace.signal('gesture:release');
// Switching from and back to a lab profile must retain the preceding output.
const smooth=createAutoB1Director({seed:3,limits});let frame;
for(let i=0;i<300;i++)frame=smooth.step(.016,{enabled:true,intensity:.75});
const previous=frame.smileR;assert.equal(smooth.testProfile('S3',1),true);
frame=smooth.step(.016,{enabled:true,intensity:.75});assert.ok(Math.abs(frame.smileR-previous)<.02,'entering a lab test is continuous');
let prior=frame;
for(let i=0;i<500;i++){
 const next=smooth.step(.016,{enabled:true,intensity:.75});
 assert.ok(Math.abs(next.smileR-prior.smileR)<.04,'manual/automatic smile transition must be bounded');prior=next;
}
