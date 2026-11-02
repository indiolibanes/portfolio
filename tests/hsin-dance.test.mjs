import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
import {createDancePose} from '../src/scripts/hsin-dance-pose.mjs';
import {createDanceDirector} from '../src/scripts/hsin-dance-director.mjs';
import {createMusicState} from '../src/scripts/hsin-music-state.mjs';
import {createMusicTransport} from '../src/scripts/hsin-music-transport.mjs';
import {createBodyRepertoire} from '../src/scripts/hsin-body-repertoire.mjs';
import {createBakedPose,createBakedChest} from '../src/scripts/hsin-baked-pose.mjs';
import {createPoseTransition} from '../src/scripts/hsin-pose-transition.mjs';
import {createChestDirector} from '../src/scripts/hsin-chest-director.mjs';
import {createRestBreath} from '../src/scripts/hsin-rest-breath.mjs';
const text=await readFile('public/assets/animations/hsin/lunar-dance-r1.json','utf8'),data=JSON.parse(text),manifest=JSON.parse(await readFile('src/data/hsin-dance.json')),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(text),manifest.sha256);assert.equal(Buffer.byteLength(text),manifest.bytes);
assert.equal(Object.keys(data.phrases).length,7);assert.ok(data.names.every(n=>!/Foot|Calf|Thigh|Pelvis|Finger|root/.test(n)));for(const p of Object.values(data.phrases)){assert.deepEqual(p.frames[0],data.rest);assert.deepEqual(p.frames.at(-1),data.rest);assert.ok(p.frames.flat().every(Number.isFinite));}
function idleActor(r,seed){const signature=createPoseTransition({pose:createBakedPose({THREE:r.T,data:r.profile.poses.signature,bones:r.bones})}),chest=createChestDirector({pose:createBakedChest({THREE:r.T,profile:r.profile.poses,bones:r.bones}),seed:seed^2}),hair=createChestDirector({pose:createBakedPose({THREE:r.T,data:r.profile.poses.hair,bones:r.bones}),seed:seed^3});return createBodyRepertoire({signature,chest,hair,seed,breath:createRestBreath({THREE:r.T,bone:r.by.get('ORG-Bip001Spine2'),update:()=>r.by.get('ORG-Bip001Spine2').updateMatrix()}),capabilities:()=>({signature:true,chest:true,hair:true,composition:true})});}
async function session(seed){
 const r=await danceRig();assert.equal(hash(r.bytes),data.modelSha256);assert.equal(hash(r.profileBytes),data.profileSha256);r.model.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});let now=0,token=null,played=0,writes=0,director;
 const music=createMusicState({now:()=>now}),transport=createMusicTransport({now:()=>now}),base=idleActor(r,seed),pose=createDancePose({THREE:r.T,data,bones:r.bones}),seen=new Set(),rawApply=pose.apply;
 pose.apply=(...args)=>{seen.add(args[0]);return rawApply(...args);};const idle={...base,advance(...args){assert.ok(!director?.owns(),'idle cannot write during dance ownership');writes++;base.advance(...args);}};
 director=createDanceDirector({idle,pose,music,transport,seed});const trace=[],states=new Set(),a=new r.T.Quaternion(),b=new r.T.Quaternion(),before=new Float64Array(data.rest.length);let maxStep=0,maxGap=0,pauseChecks=0;
 const feet=['ORG-Bip001FootL','ORG-Bip001FootR','DEF-Bip001FootL','DEF-Bip001FootR'].map(n=>({bone:r.by.get(n),world:r.by.get(n).getWorldPosition(new r.T.Vector3())}));
 const report=status=>music.observe(token,{status,trackId:music.sample().provider==='youtube'?'Yhf9ur3xPQA':'spotify:track:fixture',positionSeconds:played,durationSeconds:1000});
 for(let i=0;i<18000;i++){
  now=i/30*1000;const s=i/30;
  if(i===240)token=music.select('youtube');if(i===540)report('playing');if(i===3150)report('paused');if(i===3630)report('playing');if(i===5400)report('buffering');if(i===5730)report('playing');if(i===6300){played+=40;report('playing');}
  if(i===7200)token=music.select('spotify');if(i===7500)report('playing');if(i===9900)music.select('none');if(i===10560){token=music.select('spotify');report('playing');}if(i===12600)report('ended');if(i===13500)report('playing');if(i===15000)music.select('none');if(i===16200){token=music.select('youtube');report('playing');}if(i===17400)report('ended');
  if(music.sample().status==='playing'){played+=1/30;if(i%15===0)report('playing');}
  for(let k=0;k<data.names.length;k++)r.by.get(data.names[k]).quaternion.toArray(before,k*4);
  const frozen=(s>=460&&s<465)||(s>=500&&s<510);const ownerBefore=director.owns();if(!frozen)director.advance(1/30);else pauseChecks++;
  const d=director.diagnostics();states.add(d.state);if(i%30===0)trace.push([d.state,d.phrase,d.episodes]);
  if(s<18)assert.equal(d.state,'CONTEMPLATIVE_IDLE','selected source without Play cannot dance');
  for(let k=0;k<data.names.length;k++){const q=r.by.get(data.names[k]).quaternion;if(frozen)assert.deepEqual(q.toArray(),Array.from(before.subarray(k*4,k*4+4)),'paused/hidden loop changes no pose');if(ownerBefore||d.owns){a.fromArray(before,k*4).normalize();b.copy(q).normalize();maxStep=Math.max(maxStep,a.angleTo(b));}}
  if(i%30===0){r.model.updateMatrixWorld(true);for(const f of feet)assert.ok(f.bone.getWorldPosition(new r.T.Vector3()).distanceTo(f.world)<1e-12,'planted feet cannot slide');if(d.owns)for(const part of ['Spine2','Neck','Head','UpperArmL','UpperArmR','ForearmL','ForearmR','HandL','HandR'])maxGap=Math.max(maxGap,r.by.get('ORG-Bip001'+part).getWorldPosition(new r.T.Vector3()).distanceTo(r.by.get('DEF-Bip001'+part).getWorldPosition(new r.T.Vector3())));}
 }
 assert.ok(maxStep<.06,'no angular teleport at handoff, seek or recovery: '+maxStep);assert.ok(maxGap<1e-5);assert.ok(states.size===6);assert.equal(seen.size,7);assert.ok(pauseChecks>0&&writes>0);director.dispose();base.dispose();pose.restore();data.names.forEach((n,k)=>assert.deepEqual(r.by.get(n).quaternion.toArray(),data.rest.slice(k*4,k*4+4)));music.dispose();return {trace,maxStepDegrees:maxStep*180/Math.PI,maxOrgDefGap:maxGap,states:[...states],phrases:[...seen],seconds:600,bufferBytes:pose.bufferBytes()};
}
const first=await session(27),second=await session(27);assert.deepEqual(first.trace,second.trace,'600-second seeded sessions reproduce');
// With no music, the original idle advances with exactly the same seeded trace.
const r0=await danceRig(),r1=await danceRig(),base0=idleActor(r0,81),base1=idleActor(r1,81),music=createMusicState(),pose=createDancePose({THREE:r1.T,data,bones:r1.bones}),director=createDanceDirector({idle:base1,pose,music,transport:createMusicTransport(),seed:81});for(let i=0;i<1800;i++){base0.advance(1/30,{enabled:true});director.advance(1/30);assert.deepEqual(base1.diagnostics(),base0.diagnostics());}director.dispose();base0.dispose();base1.dispose();

// Reduced motion / manual suspension does not start a dance or advance an idle pose.
const pausedMusic=createMusicState(),pausedToken=pausedMusic.select('youtube');pausedMusic.observe(pausedToken,{status:'playing',trackId:'fixture',positionSeconds:0,durationSeconds:100});const pausedDirector=createDanceDirector({idle:base1,pose,music:pausedMusic,transport:createMusicTransport()});const frozen=r1.bones.map(b=>b.quaternion.toArray());for(let i=0;i<60;i++)pausedDirector.advance(1/30,{enabled:false});assert.equal(pausedDirector.diagnostics().state,'CONTEMPLATIVE_IDLE');assert.deepEqual(r1.bones.map(b=>b.quaternion.toArray()),frozen);pausedDirector.dispose();

// Playback/recovery creates no new Quaternion objects after construction.
let allocations=0;class Counted extends r1.T.Quaternion{constructor(...a){super(...a);allocations++;}}const player=createDancePose({THREE:{...r1.T,Quaternion:Counted},data,bones:r1.bones});const initial=allocations;for(let i=0;i<600;i++)player.apply('petal-flourish',i/600);player.beginRecovery();for(let i=0;i<=120;i++)player.recover(i/120);assert.equal(allocations,initial);player.restore();
console.log('Dance PASS: 600 s twice, seeded phrases, no-music parity, confirmed Play, handoff, pause/resume, buffering, seek, end, provider swap, hidden freeze, all 7 phrases, planted feet, ORG/DEF, exact reference and zero Quaternion allocation in playback.');console.log(JSON.stringify({...first,trace:undefined}));if(process.env.HSIN_DANCE_REPORT)await writeFile('docs/hsin-dance-runtime-qa.json',JSON.stringify({...first,trace:undefined},null,2)+'\n');
