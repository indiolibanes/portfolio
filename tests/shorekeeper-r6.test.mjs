import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createAnatomicalFaceDirector,R6_CANDIDATES,PUPIL_CAP} from '../src/scripts/shorekeeper/anatomical-face.mjs';
import {createFaceExpressionController} from '../src/scripts/shorekeeper/shorekeeper-face-expressions.mjs';
import {createGentleFace} from '../src/scripts/shorekeeper/gentle-acting.mjs';
import {facialOwner} from '../src/scripts/shorekeeper/facial-ownership.mjs';
const golden=JSON.parse(fs.readFileSync(new URL('../docs/characters/shorekeeper-r6-baseline-golden.json',import.meta.url)));
function fixture(){
 const morphMeshes=golden.meshes.map(m=>({...m,morphTargetInfluences:new Array(Object.keys(m.morphTargetDictionary).length).fill(0)}));
 return {morphMeshes,names:morphMeshes.flatMap(m=>Object.keys(m.morphTargetDictionary)),weights:{}};
}
function vector(i){return i.morphMeshes.flatMap(m=>m.morphTargetInfluences);}
function fingerprint(i){return JSON.stringify(vector(i));}
function digestFrame(hash,i){const v=vector(i),b=Buffer.alloc(v.length*8);v.forEach((x,j)=>b.writeDoubleLE(x,j*8));hash.update(b);}

test('70 pre-R6 original GLB weight streams remain bit-exact, including blink/manual return at 30/60Hz',()=>{
 for(const c of golden.cases){const i=fixture(),f=createAnatomicalFaceDirector(i);f.setIntensity(c.intensity);if(c.intensity)f.playBaseline(c.id);const hash=crypto.createHash('sha256');for(let n=0;n<c.hz*6;n++){if(n===Math.round(1.7*c.hz))f.trigger('blink');if(n===Math.round(3.2*c.hz))f.triggerQA('NEUTRAL');f.advance(1/c.hz);digestFrame(hash,i);}assert.equal(hash.digest('hex'),c.sha256,JSON.stringify(c));f.dispose();}
});

test('ownership is atomic across old/new wrappers, and is relinquished only by dispose',()=>{
 const i=fixture(),f=createAnatomicalFaceDirector(i);assert.throws(()=>createGentleFace({...i}),/writer/);assert.throws(()=>createFaceExpressionController({meshes:i.morphMeshes}),/writer/);assert.throws(()=>createAnatomicalFaceDirector({...i}),/writer/);assert(facialOwner(i).every(m=>m.owner==='anatomical-face-r6'));f.dispose();f.dispose();const g=createGentleFace(i);assert.throws(()=>createAnatomicalFaceDirector(i),/writer/);g.dispose();const h=createAnatomicalFaceDirector(i);h.dispose();
});

test('all candidates stay finite and return to zero in a deterministic 600s MANUAL command simulation',()=>{
 const i=fixture(),f=createAnatomicalFaceDirector(i),ids=Object.keys(R6_CANDIDATES);let count=0;const started=performance.now();
 for(let frame=0;frame<600*60;frame++){if(frame%600===0){f.setIntensity([.25,.5,.75,1][count%4]);f.playCandidate(ids[count++%ids.length]);}if(frame%600===120)f.trigger('blink');f.advance(1/60);for(const value of vector(i))assert(Number.isFinite(value)&&value>=0&&value<=1);const w=f.report().weights;assert(Math.hypot(w.Pupil_L-w.Pupil_R,w.Pupil_Up-w.Pupil_Down)<=PUPIL_CAP+1e-12);if(frame%600===599)assert(vector(i).every(v=>v===0));}
 console.log(JSON.stringify({simulatedSeconds:600,manualCommands:count,wallCpuMs:performance.now()-started,hardwarePerformance:false,schedulerR7:false}));f.dispose();
});

test('blink, masks, chin asymmetry, gaze direction, worried oral isolation and combat recovery',()=>{
 const i=fixture(),f=createAnatomicalFaceDirector(i);f.playCandidate('LITTLE_SMILE_ACTING_R6');f.seek(2);let w=f.report().weights;assert.equal(w.C_ZL_Face,.8);assert.equal(w.C_ZR_Face,0);assert.equal(w.M_Smile_L,.9);assert.equal(w.M_Smile_R,.5);f.setRegion('mouth',false);assert.equal(f.report().weights.M_Smile_L,0);f.playBaseline('LITTLE_SMILE_V2');f.advance(.4);assert.equal(f.report().weights.M_Smile_L,.9);f.trigger('blink');f.advance(.13);assert.equal(f.report().weights.E_Close,1);f.advance(.08);assert.equal(f.report().weights.E_Close,1);f.advance(.20);assert.equal(f.report().weights.E_Close,0);
 f.playCandidate('WORRIED_FIXED_R6');f.seek(2);w=f.report().weights;assert.equal(w.B_Sad,1);assert.equal(w.E_Sad,.7);assert.equal(w.M_Ennui_L,0);assert.equal(w.M_Ennui_R,0);
 f.playCandidate('GLANCE_BILATERAL_R6');f.seek(1);w=f.report().weights;assert(w.Pupil_L>0&&w.Pupil_R===0);f.seek(3.3);w=f.report().weights;assert(w.Pupil_R>0&&w.Pupil_L===0);f.seek(6.8);assert(vector(i).every(v=>v===0));
 f.onAnimationEvent({clip:'SK_BURST_02_ORIGINAL',type:'start'});assert.equal(f.playCandidate('MY_STAR_ACTING_R6'),false);assert.equal(f.trigger('blink'),false);f.advance(2);assert(vector(i).every(v=>v===0));f.onAnimationEvent({clip:'SK_BURST_02_ORIGINAL',type:'end'});assert.equal(f.playCandidate('MY_STAR_ACTING_R6'),true);f.dispose();
});

test('lifecycle restores all 69 channels, rejects unsupported/unsafe inputs, freeze and pause have no writes',()=>{
 const i=fixture();i.morphMeshes[0].morphTargetInfluences[1]=.17;const initial=fingerprint(i);
 for(let cycle=0;cycle<3;cycle++){const f=createAnatomicalFaceDirector(i);assert.throws(()=>f.probe('L_P',1));assert.throws(()=>f.setIntensity(NaN));assert.throws(()=>f.seek(Infinity));assert.throws(()=>f.advance(-1));f.probe('Pupil_L',1);assert.equal(f.report().weights.Pupil_L,.3);f.playCandidate('MY_STAR_ACTING_R6');f.advance(2);f.setFrozen(true);const hold=fingerprint(i);f.advance(10);assert.equal(fingerprint(i),hold);f.setFrozen(false);f.setPaused(true);f.advance(10);assert.equal(fingerprint(i),hold);f.setPaused(false);f.restore();assert.equal(fingerprint(i),initial);f.advance(2);assert.equal(fingerprint(i),initial);f.dispose();f.dispose();assert.equal(fingerprint(i),initial);f.advance(2);assert.equal(fingerprint(i),initial);assert.equal(f.playCandidate('MY_STAR_ACTING_R6'),false);}
});
