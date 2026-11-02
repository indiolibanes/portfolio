/** Moon Fox Reverie on the real GLB: data contract, locked feet at every intensity, continuity, restitution, secondary rest, cost, 600 s sessions. Needs three (CI). */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
import {decodeDanceData} from '../src/scripts/hsin-dance-data.mjs';
import {createDancePose} from '../src/scripts/hsin-dance-pose.mjs';
import {createReveriePose,decodeReverieData} from '../src/scripts/hsin-dance-reverie.mjs';
import {createDanceDirector,REVERIE,REVERIE_GRAND} from '../src/scripts/hsin-dance-director.mjs';
import {DANCE_R3} from '../src/scripts/hsin-dance-config.mjs';
import {createMusicState} from '../src/scripts/hsin-music-state.mjs';
import {createMusicTransport} from '../src/scripts/hsin-music-transport.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile('src/data/hsin-dance-r3.json'));
assert.ok(manifest.conservative,'run `node scripts/bake-hsin-dance-r3.mjs` (CI does) before this test');
const r=await danceRig(),{T}=r;
const load=async entry=>{const raw=await readFile('public'+entry.url);assert.equal(hash(raw),entry.sha256);assert.equal(raw.length,entry.bytes);return decodeReverieData(JSON.parse(raw));};
const dataC=await load(manifest.conservative),dataG=manifest.dramatic?await load(manifest.dramatic):null;
for(const d of [dataC,dataG].filter(Boolean)){assert.equal(d.modelSha256,hash(r.bytes));assert.equal(d.profileSha256,hash(r.profileBytes));assert.equal(d.publicVersion,'2.0.1');assert.equal(d.visual,'VISUAL_QA_PENDING');assert.equal(d.names.length,40);assert.equal(d.rest.length,160);}
assert.deepEqual(Object.keys(dataC.phrases),[REVERIE]);assert.ok(dataC.phrases[REVERIE].safety.pass);
const pose=createReveriePose({THREE:T,data:dataC,bones:r.bones,model:r.model});assert.ok(pose.ready&&pose.lowerBody&&pose.secondaryBones>150,'secondary bones: '+pose.secondaryBones);
r.model.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
const restSecondary=new Map(dataC.secondary.names.map(n=>[n,r.by.get(n).quaternion.clone()]));
const baseline={};for(const side of ['L','R'])baseline[side]=r.by.get('ORG-Bip001Foot'+side).getWorldPosition(new T.Vector3());

// Real sole vertices (as in the R2 test): the contact surface, not an ankle proxy.
const soles=[];for(const mesh of r.meshes){mesh.skeleton.update();const g=mesh.geometry;for(let i=0;i<g.attributes.position.count;i++){
 let side=null;for(const s of ['L','R']){let weight=0;for(let k=0;k<4;k++){const n=mesh.skeleton.bones[g.attributes.skinIndex.getComponent(i,k)].name;if(n==='ORG-Bip001Foot'+s||n==='ORG-Bip001Toe0'+s||n.startsWith('ORG-Bone_Toe')&&n.endsWith('_'+s))weight+=g.attributes.skinWeight.getComponent(i,k);}if(weight>.5)side=s;}
 if(side){const p=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld);if(p.y<.005&&i%4===0)soles.push({mesh,i,side,p});}
}}
assert.ok(soles.length>100);
const report={publicVersion:'2.0.1',visual:'VISUAL_QA_PENDING',soleVertices:soles.length,variants:{},continuity:{},recovery:{},cost:{}};
const v=new T.Vector3(),lateral=r.by.get('ORG-Bip001ThighL').getWorldPosition(new T.Vector3()).sub(r.by.get('ORG-Bip001ThighR').getWorldPosition(new T.Vector3())).setY(0).normalize();

function measure(poseObject,name,amplitude,samples=240){
  const out={amplitude,maxSlideMm:0,minSoleYmm:Infinity,maxOrgDefGapMm:0,maxHeadForwardCm:0};
  const head0=r.by.get('ORG-Bip001Head').getWorldPosition(new T.Vector3());poseObject.restore();
  for(let s=0;s<=samples;s++){
    poseObject.apply(name,s/samples,1,amplitude);r.model.updateMatrixWorld(true);for(const m of r.meshes)m.skeleton.update();
    for(const x of soles){x.mesh.getVertexPosition(x.i,v).applyMatrix4(x.mesh.matrixWorld);out.minSoleYmm=Math.min(out.minSoleYmm,v.y*1000);out.maxSlideMm=Math.max(out.maxSlideMm,v.distanceTo(x.p)*1000);}
    for(const side of ['L','R'])for(const part of ['Thigh','Calf','Foot','Toe0'])out.maxOrgDefGapMm=Math.max(out.maxOrgDefGapMm,r.by.get('ORG-Bip001'+part+side).getWorldPosition(v).distanceTo(r.by.get('DEF-Bip001'+part+side).getWorldPosition(new T.Vector3()))*1000);
    out.maxHeadForwardCm=Math.max(out.maxHeadForwardCm,r.by.get('ORG-Bip001Head').getWorldPosition(v).sub(head0).setY(0).length()*100);
  }
  poseObject.restore();return out;
}
const limit=DANCE_R3.reverie.footSlideLimitMm;
for(const amplitude of [1,.9,.72]){
  const m=measure(pose,REVERIE,amplitude);report.variants[REVERIE+'@'+amplitude]=m;
  assert.ok(m.maxSlideMm<1,'feet stay planted (<1 mm) at intensity '+amplitude+': '+m.maxSlideMm.toFixed(3)+' mm (limit '+limit+')');
  assert.ok(m.minSoleYmm>-1,'no floor penetration at '+amplitude+': '+m.minSoleYmm.toFixed(3)+' mm');assert.ok(m.maxOrgDefGapMm<.2,'ORG/DEF in step');
}
assert.ok(report.variants[REVERIE+'@1'].maxSlideMm<1,'full intensity keeps the soles within 1 mm: '+report.variants[REVERIE+'@1'].maxSlideMm);
if(dataG){const poseG=createReveriePose({THREE:T,data:dataG,bones:r.bones,model:r.model}),m=measure(poseG,REVERIE_GRAND,1);report.variants[REVERIE_GRAND+'@1']=m;assert.ok(m.maxSlideMm<=limit&&m.minSoleYmm>-1,'dramatic variant feet: '+JSON.stringify(m));}

// 30 Hz playback continuity: per-bone step, change of step, secondary steps, quaternion hemisphere.
{
  const q=new T.Quaternion(),prev=dataC.names.map(n=>r.by.get(n).quaternion.clone()),prevStep=new Float64Array(dataC.names.length),secPrev=dataC.secondary.names.map(n=>r.by.get(n).quaternion.clone());
  const c={maxStepDeg:0,maxJumpDeg:0,maxSecondaryStepDeg:0,maxPositionStepMm:0,signFlips:0};let pos=r.model.getObjectByName(dataC.positionNames[0]).position.clone();
  const frames=Math.round(pose.duration(REVERIE)*30);
  for(let f=0;f<=frames;f++){
    pose.apply(REVERIE,f/frames,1,1,1/30);
    dataC.names.forEach((n,k)=>{q.copy(r.by.get(n).quaternion).normalize();if(q.dot(prev[k])<0)c.signFlips++;const step=q.angleTo(prev[k])*180/Math.PI;c.maxStepDeg=Math.max(c.maxStepDeg,step);if(f>1)c.maxJumpDeg=Math.max(c.maxJumpDeg,Math.abs(step-prevStep[k]));prevStep[k]=step;prev[k].copy(q);});
    dataC.secondary.names.forEach((n,k)=>{const step=r.by.get(n).quaternion.angleTo(secPrev[k])*180/Math.PI;c.maxSecondaryStepDeg=Math.max(c.maxSecondaryStepDeg,step);secPrev[k].copy(r.by.get(n).quaternion);});
    const p=r.model.getObjectByName(dataC.positionNames[0]).position;c.maxPositionStepMm=Math.max(c.maxPositionStepMm,p.distanceTo(pos)*1000);pos=p.clone();
  }
  report.continuity=c;
  assert.ok(c.maxStepDeg<5,'no angular teleport at 30 Hz: '+c.maxStepDeg.toFixed(2)+'°/frame');assert.ok(c.maxJumpDeg<2,'velocity changes gently: '+c.maxJumpDeg.toFixed(2)+'°');assert.ok(c.maxSecondaryStepDeg<4,'secondary motion is smooth: '+c.maxSecondaryStepDeg.toFixed(2));assert.ok(c.maxPositionStepMm<3,'hip travels smoothly: '+c.maxPositionStepMm.toFixed(2)+' mm/frame');
  pose.restore();
}
// Restitution: restoring returns every channel and every secondary bone to the exact captured reference.
{
  pose.apply(REVERIE,.58,1,1);assert.ok(!pose.atReference());pose.restore();assert.ok(pose.atReference());
  dataC.names.forEach((n,i)=>assert.deepEqual(r.by.get(n).quaternion.toArray(),dataC.rest.slice(i*4,i*4+4)));
  for(const [n,q0] of restSecondary)assert.deepEqual(r.by.get(n).quaternion.toArray(),q0.toArray(),'secondary bone '+n+' returns bit-exactly');
  assert.deepEqual(r.model.getObjectByName(dataC.positionNames[0]).position.toArray(),dataC.positionRest);
}
// Inertial recovery from every upright phase lands on the reference without a snap or a floor dip.
{
  const stats={};
  for(const phase of [.08,.16,.3,.44,.76,.82,.9,.96]){
    pose.restore();for(let f=0;f<=Math.round(phase*pose.duration(REVERIE)*30);f++)pose.apply(REVERIE,f/Math.round(pose.duration(REVERIE)*30),1,1,1/30);
    pose.beginRecovery();const q=new T.Quaternion(),prev=dataC.names.map(n=>r.by.get(n).quaternion.clone());let maxStep=0,minSole=Infinity;
    for(let f=1;f<=48;f++){pose.recover(f/48,DANCE_R3.reverie.recoverySeconds);r.model.updateMatrixWorld(true);for(const m of r.meshes)m.skeleton.update();dataC.names.forEach((n,k)=>{q.copy(r.by.get(n).quaternion);maxStep=Math.max(maxStep,q.angleTo(prev[k])*180/Math.PI);prev[k].copy(q);});for(const x of soles)minSole=Math.min(minSole,x.mesh.getVertexPosition(x.i,v).applyMatrix4(x.mesh.matrixWorld).y*1000);}
    assert.ok(pose.atReference(),'recovery from phase '+phase+' ends exactly on the reference');assert.ok(maxStep<9,'recovery step '+maxStep.toFixed(2)+'° at '+phase);assert.ok(minSole>-1.5,'no floor dip in recovery from '+phase+': '+minSole.toFixed(2));
    stats[phase]={maxStepDeg:+maxStep.toFixed(2),minSoleMm:+minSole.toFixed(2)};
  }
  report.recovery=stats;
}
// Zero per-frame allocation in the player.
{let allocations=0;class Counted extends T.Quaternion{constructor(...a){super(...a);allocations++;}}class CountedV extends T.Vector3{constructor(...a){super(...a);allocations++;}}
 const counted=createReveriePose({THREE:{...T,Quaternion:Counted,Vector3:CountedV},data:dataC,bones:r.bones,model:r.model}),initial=allocations;for(let i=0;i<600;i++)counted.apply(REVERIE,i/600,1,.9);counted.beginRecovery();for(let i=1;i<=30;i++)counted.recover(i/30);assert.equal(allocations,initial,'no Quaternion/Vector3 allocation during apply/recover');counted.restore();}
// Cost against R2: same machine, same loop.
{
  const manifestR2=JSON.parse(await readFile('src/data/hsin-dance.json')),dataR2=decodeDanceData(JSON.parse(await readFile('public'+manifestR2.url))),r2=createDancePose({THREE:T,data:dataR2,bones:r.bones,model:r.model});
  const time=(fn,n=3000)=>{for(let i=0;i<200;i++)fn(i);const t0=performance.now();for(let i=0;i<n;i++)fn(i);return (performance.now()-t0)/n;};
  const waltz=time(i=>r2.apply('lunar-waltz',(i%600)/600,1,.9)),reverie=time(i=>pose.apply(REVERIE,(i%600)/600,1,.9));r2.restore();pose.restore();
  const r2Linear=createDancePose({THREE:T,data:dataR2,bones:r.bones,model:r.model,smoothing:'linear'}),waltzLinear=time(i=>r2Linear.apply('lunar-waltz',(i%600)/600,1,.9));r2Linear.restore();
  report.cost={cpuMsPerApply:{r2WaltzSpline:+waltz.toFixed(4),r2WaltzLinear:+waltzLinear.toFixed(4),reverieWithSecondary:+reverie.toFixed(4)},bytes:{r2Asset:manifestR2.bytes,r3Conservative:manifest.conservative.bytes,r3Dramatic:manifest.dramatic?.bytes??null},runtimeBufferBytes:{r2:createDancePose({THREE:T,data:dataR2,bones:r.bones,model:r.model}).bufferBytes(),r3:pose.bufferBytes()},secondaryBones:pose.secondaryBones,note:'CPU Node timings on a CI runner; evidence of relative cost only, not FPS.'};
  assert.ok(reverie<1.5,'a 30 Hz apply of the reverie stays far below the 33 ms frame: '+reverie.toFixed(3)+' ms');
}
// Repeatable 600 s sessions with the real R2 pose and the real reverie pose, forced to happen at least once per session.
{
  const manifestR2=JSON.parse(await readFile('src/data/hsin-dance.json')),dataR2=decodeDanceData(JSON.parse(await readFile('public'+manifestR2.url))),r2=createDancePose({THREE:T,data:dataR2,bones:r.bones,model:r.model});
  const names=[...dataR2.names,...dataC.names,...dataC.secondary.names];
  function run(seed,reverie){
    pose.restore();r2.restore();let now=0,position=0,token;const music=createMusicState({now:()=>now}),transport=createMusicTransport({now:()=>now});
    const director=createDanceDirector({idle:{advance(){assert.ok(!director.owns());},busy:()=>false,release(){}},pose:r2,music,transport,seed,special:{conservative:pose,dramatic:null},reverie});
    const q=new T.Quaternion(),prev=new Map(names.map(n=>[n,r.by.get(n).quaternion.clone()]));let maxStep=0,minSole=Infinity,episodes=0,wasSpecial=false,trace=[];
    const status=s=>music.observe(token,{status:s,trackId:'fixture',positionSeconds:position,durationSeconds:1000});
    for(let i=0;i<18000;i++){
      now=i*1000/30;if(i===30)token=music.select('youtube');if(i===90)status('playing');
      if(i===6000||i===13000)status('paused');if(i===6100||i===13100)status('playing');
      if(music.sample().status==='playing'){position+=1/30;if(i%15===0)status('playing');}
      director.advance(1/30);const d=director.diagnostics();if(d.special&&!wasSpecial)episodes++;wasSpecial=!!d.special;if(i%30===0)trace.push([d.state,d.phrase,d.specials]);
      for(const [n,p] of prev){q.copy(r.by.get(n).quaternion).normalize();maxStep=Math.max(maxStep,q.angleTo(p)*180/Math.PI);p.copy(q);}
      if(i%3===0){r.model.updateMatrixWorld(true);for(const x of soles)minSole=Math.min(minSole,x.mesh.getVertexPosition(x.i,v).applyMatrix4(x.mesh.matrixWorld).y);}
    }
    director.dispose();assert.ok(pose.atReference()&&r2.atReference(),'both poses hand the body back exactly');
    return {episodes,maxStep,minSole,hash:hash(JSON.stringify(trace))};
  }
  const forced={chance:.5,cooldownSeconds:45,minPlayingSeconds:0,minPhrasesBefore:0},results=[];
  for(const seed of [3,5,9]){const a=run(seed,forced),b=run(seed,forced);assert.deepEqual(a,b,'seed '+seed+' reproduces exactly');assert.ok(a.episodes>=1,'seed '+seed+' plays the reverie');assert.ok(a.maxStep<16,'no teleport through handoffs and interruptions: '+a.maxStep.toFixed(2));assert.ok(a.minSole*1000>-1.5,'no floor penetration in session: '+(a.minSole*1000).toFixed(2));results.push({seed,episodes:a.episodes,maxStepDeg:+a.maxStep.toFixed(2),minSoleMm:+(a.minSole*1000).toFixed(2)});}
  // Default settings: rare. Over 10 minutes the reverie must not dominate.
  const normal=[1,2,3,4,5,6].map(seed=>run(seed,{}).episodes);assert.ok(normal.every(n=>n<=4),'default settings keep it rare: '+normal.join(','));report.sessions={forced:results,defaultEpisodesPer600s:normal};
}
console.log('Moon Fox Reverie R3 PASS',JSON.stringify({slide:report.variants[REVERIE+'@1'].maxSlideMm.toFixed(3)+' mm',continuity:report.continuity,cost:report.cost.cpuMsPerApply}));
if(process.env.HSIN_DANCE_REPORT){await mkdir('docs/qa/hsin-dance-r3',{recursive:true});await writeFile('docs/qa/hsin-dance-r3/geometry.json',JSON.stringify(report,null,2)+'\n');}
