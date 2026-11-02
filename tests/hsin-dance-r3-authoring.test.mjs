/** Moon Fox Reverie score, secondary-motion maths, spline interpolation and rig names. Pure Node: no three. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pchip,KEYS,HIP_KEYS,MOVEMENTS,UNSAFE_WINDOWS,VARIANTS,REVERIE_NAME,REVERIE_GRAND_NAME,evaluate,sampleCount,bowDegrees} from '../scripts/lib/hsin-reverie-authoring.mjs';
import {SECONDARY_GROUPS,classifySecondary,chainWeights,follow,buildTracks,envelope,quantise} from '../scripts/lib/hsin-secondary-authoring.mjs';
import {splineQuaternion,linearQuaternion} from '../src/scripts/hsin-dance-interp.mjs';
import {sanitize} from '../scripts/lib/hsin-rig.mjs';

const FIELDS=['yaw','roll','headYaw','headRoll','shoulderL','shoulderR','outL','outR','liftL','liftR','elbowL','elbowR','wristL','wristR','pitch1','pitch2','neckPitch','headPitch','armCounter','hipX','hipY','hipZ'];

// Score: starts and ends on the untouched reference, with zero velocity.
for(const variant of [REVERIE_NAME,REVERIE_GRAND_NAME]){
  const start=evaluate(variant,0),end=evaluate(variant,1);
  for(const f of FIELDS){assert.ok(Math.abs(start[f])<1e-9,variant+' starts at rest: '+f);assert.ok(Math.abs(end[f])<1e-9,variant+' ends at rest: '+f);}
  const seconds=VARIANTS[variant].seconds,h=1e-4;
  for(const f of FIELDS){const v0=Math.abs(evaluate(variant,h)[f]-start[f])/h/seconds,v1=Math.abs(end[f]-evaluate(variant,1-h)[f])/h/seconds;assert.ok(v0<2,'soft departure '+f+' '+v0);assert.ok(v1<2,'soft arrival '+f+' '+v1);}
  // Velocity continuity: no sample-to-sample jump in speed, i.e. not stop-and-go at every key.
  let worstJump=0,peakSpeed=0;
  for(const f of FIELDS){let last=null;for(let i=0;i<=1200;i++){const t=i/1200,p=evaluate(variant,t)[f],q=evaluate(variant,Math.min(1,t+1/1200))[f],speed=(q-p)*1200/seconds;if(last!==null)worstJump=Math.max(worstJump,Math.abs(speed-last)*(/hip/.test(f)?100:1));last=speed;peakSpeed=Math.max(peakSpeed,Math.abs(speed)*(/hip/.test(f)?100:1));}}
  assert.ok(worstJump<18,variant+' velocity changes smoothly: '+worstJump.toFixed(2));assert.ok(peakSpeed<72,variant+' peak speed (deg/s, hips cm/s) '+peakSpeed.toFixed(1));
  let spine=0,drop=0,back=0;for(let i=0;i<=800;i++){const e=evaluate(variant,i/800);spine=Math.max(spine,e.spineDegrees);drop=Math.max(drop,-e.hipY);back=Math.max(back,-e.hipZ);}
  assert.ok(spine<=bowDegrees(VARIANTS[variant])+1e-6,variant+' never exceeds its declared inclination: '+spine);assert.ok(drop<.09&&back<.08,'hip lowering stays inside the leg reach: '+drop.toFixed(3)+'/'+back.toFixed(3));
}
assert.ok(bowDegrees(VARIANTS[REVERIE_NAME])<=36,'conservative bow is conservative');assert.ok(bowDegrees(VARIANTS[REVERIE_GRAND_NAME])>bowDegrees(VARIANTS[REVERIE_NAME]));
assert.equal(sampleCount(REVERIE_NAME),205);assert.ok(VARIANTS[REVERIE_NAME].seconds>=10&&VARIANTS[REVERIE_NAME].seconds<=15,'10–15 s');

// Interpolation between keys keeps every authored extreme (no overshoot beyond neighbouring keys) and is C1 across keys.
for(const f of ['outR','outL','yaw','bow','elbowR']){
  for(let i=0;i<KEYS.length-1;i++){const a=KEYS[i][f]??0,b=KEYS[i+1][f]??0,lo=Math.min(a,b)-1e-9,hi=Math.max(a,b)+1e-9;
    for(let s=0;s<=20;s++){const t=KEYS[i].t+(KEYS[i+1].t-KEYS[i].t)*s/20,v=pchip(KEYS,f,t);assert.ok(v>=lo&&v<=hi,f+' stays monotone inside segment '+i);}}
  for(let i=1;i<KEYS.length-1;i++){const t=KEYS[i].t,e=1e-6,left=(pchip(KEYS,f,t)-pchip(KEYS,f,t-e))/e,right=(pchip(KEYS,f,t+e)-pchip(KEYS,f,t))/e;assert.ok(Math.abs(left-right)<Math.max(1,Math.abs(left))*.05,f+' C1 at key '+t);}
}

// Movements: contiguous, five, the bow lives only in C and its edges, the unsafe window sits inside C–D.
assert.deepEqual(MOVEMENTS.map(m=>m.id),['A','B','C','D','E']);assert.equal(MOVEMENTS[0].from,0);assert.equal(MOVEMENTS.at(-1).to,1);for(let i=1;i<MOVEMENTS.length;i++)assert.equal(MOVEMENTS[i].from,MOVEMENTS[i-1].to);
for(let i=0;i<=400;i++){const t=i/400,e=evaluate(REVERIE_NAME,t);if(t<.44||t>.78)assert.ok(e.bow<1e-9,'no inclination outside Lunar Bow / Moonlit Recovery at '+t);}
const bow=MOVEMENTS.find(m=>m.id==='C'),recovery=MOVEMENTS.find(m=>m.id==='D');for(const [a,b] of UNSAFE_WINDOWS){assert.ok(a>=bow.from&&b<=recovery.to);}
// Moonlit Recovery: torso returns before the head (head lag), as authored.
{const e=evaluate(REVERIE_NAME,.70);assert.ok(e.headPitch/VARIANTS[REVERIE_NAME].head>e.pitch1/VARIANTS[REVERIE_NAME].spine1,'head returns late');}
// Asymmetry in the prelude and an open silhouette in the finale.
{const e=evaluate(REVERIE_NAME,.14);assert.ok(e.outR>e.outL+10,'asymmetric opening');const f=evaluate(REVERIE_NAME,.89);assert.ok(f.outR>=60&&f.outL>=28,'one arm rises, the other answers');assert.ok(Math.abs(evaluate(REVERIE_NAME,.875).outR-evaluate(REVERIE_NAME,.905).outR)<4,'brief sustained silhouette');}
// Wrists finish curves after elbows: the wrist peaks later than the elbow on the same arm in the spiral.
{let eT=0,wT=0,eMax=-1,wMax=-1;for(let i=0;i<=1000;i++){const t=.16+.28*i/1000,e=evaluate(REVERIE_NAME,t);if(e.elbowL>eMax){eMax=e.elbowL;eT=t;}if(e.wristL>wMax){wMax=e.wristL;wT=t;}}assert.ok(wT>=eT-1e-9,'wrist after elbow '+eT+' '+wT);}

// Secondary maths.
assert.equal(envelope(0),0);assert.equal(envelope(1),0);assert.ok(envelope(.5)===1);
{const response=follow(new Float64Array(120).fill(1),1/15,{omega:9,zeta:.55});const peak=Math.max(...response);assert.ok(peak>1&&peak<1.2,'damped overshoot '+peak);assert.ok(Math.abs(response.at(-1)-1)<.02,'settles');}
for(const [id,group] of Object.entries(SECONDARY_GROUPS)){
  const n=205,zeros=new Array(n).fill(0),bowProfile=Array.from({length:n},(_,i)=>evaluate(REVERIE_NAME,i/(n-1)).bow);
  const tracks=buildTracks({vl:zeros,vf:zeros,wUp:zeros,bow:bowProfile},.0667,group);
  assert.equal(tracks.sway[0],0);assert.equal(tracks.pitch[0],0);assert.equal(tracks.sway[n-1],0);assert.equal(tracks.pitch[n-1],0);
  assert.ok(tracks.pitch.every(v=>v>=-1&&v<=1)&&tracks.sway.every(v=>v>=-1&&v<=1));
  assert.ok(Math.min(...tracks.pitch)<-.25*group.gravity/.6||group.gravity<.2,id+' hangs back toward vertical during the bow');
  const moving=buildTracks({vl:Array.from({length:n},(_,i)=>Math.sin(i/10)*.3),vf:zeros,wUp:zeros,bow:new Array(n).fill(0)},.0667,group);assert.ok(Math.max(...moving.sway.map(Math.abs))>.05,id+' responds to anchor motion');
  assert.ok(quantise(moving.sway).every(v=>Number.isInteger(v)&&Math.abs(v)<=32767));
}
assert.equal(classifySecondary('ORG-Bone_Tail003_M',['ORG-Bone_Tail002_M','ORG-Bip001Pelvis']),'tail');
assert.equal(classifySecondary('ORG-Bone_Hair012_R',['ORG-Bone_Hair011_R','ORG-Bip001Head']),'hair');
assert.equal(classifySecondary('ORG-Bone_Piao033_L',['ORG-Bone_Piao032_L','ORG-Bip001UpArmTwist2L']),'sleeveL');
assert.equal(classifySecondary('ORG-Bone_Piao033_R',['ORG-Bone_Piao032_R','ORG-Bip001UpArmTwist2R']),'sleeveR');
assert.equal(classifySecondary('ORG-Bone_Piao014_R',['ORG-Bone_Piao017_R','ORG-Bone_Hair151_R','ORG-Bip001Head']),'hair','head ribbons follow the head');
assert.equal(classifySecondary('ORG-Bone_Skirt001_R',['ORG-Bip001Pelvis']),null);assert.equal(classifySecondary('ORG-Bip001Head',[]),null);
{let last=0;for(let d=0;d<8;d++){const g=chainWeights(d,8).gain;assert.ok(g>=last&&g<=1,'tips lag more than roots');last=g;}}

// Spline interpolation: hits every sample, stays unit, and is smoother than linear slerp between the same samples.
{
  const quat=a=>{const h=a/2;return [Math.sin(h)*.6,Math.sin(h)*.8,0,Math.cos(h)];},angle=t=>.9*Math.sin(2*Math.PI*t*.8)+.35*Math.sin(2*Math.PI*t*2.1),samples=21,frames=Array.from({length:samples},(_,i)=>Float32Array.from(quat(angle(i/(samples-1)))));
  const out=new Float64Array(4),lin=new Float64Array(4),angleOf=q=>2*Math.atan2(Math.hypot(q[0],q[1],q[2]),q[3]);
  let splineError=0,linearError=0;const splineSpeed=[],linearSpeed=[],steps=(samples-1)*2;
  for(let s=0;s<=steps;s++){const x=s/steps*(samples-1),i=Math.min(samples-2,Math.floor(x)),mix=x-i,truth=angle(s/steps);
    splineQuaternion(frames,i,mix,0,out);linearQuaternion(frames,i,mix,0,lin);
    assert.ok(Math.abs(Math.hypot(...out)-1)<1e-9,'unit');
    const tq=quat(truth),away=q=>2*Math.acos(Math.min(1,Math.abs(q[0]*tq[0]+q[1]*tq[1]+q[2]*tq[2]+q[3]*tq[3])));if(i>=1&&i<=samples-3){splineError=Math.max(splineError,away(out));linearError=Math.max(linearError,away(lin));}
    splineSpeed.push(Math.sign(out[0]||1)*angleOf(out));linearSpeed.push(Math.sign(lin[0]||1)*angleOf(lin));
    if(mix===0){for(let c=0;c<4;c++)assert.ok(Math.abs(out[c]-frames[i][c])<1e-6,'passes through the authored sample');}}
  assert.ok(splineError<linearError,'spline tracks the intended motion better between interior samples: '+splineError.toFixed(5)+' vs '+linearError.toFixed(5));
  const jump=a=>{let m=0;for(let i=2;i<a.length;i++)m=Math.max(m,Math.abs((a[i]-a[i-1])-(a[i-1]-a[i-2])));return m;};
  assert.ok(jump(splineSpeed)<jump(linearSpeed),'angular velocity changes more gently with the spline: '+jump(splineSpeed).toFixed(5)+' vs '+jump(linearSpeed).toFixed(5));
  // Sign flips in storage (q and -q are the same rotation) do not break the spline.
  const flipped=frames.map((f,i)=>i%2?f.map(v=>-v):f);splineQuaternion(flipped,4,.5,0,out);const ref=new Float64Array(4);splineQuaternion(frames,4,.5,0,ref);assert.ok(Math.abs(Math.abs(out[0]*ref[0]+out[1]*ref[1]+out[2]*ref[2]+out[3]*ref[3])-1)<1e-5,'hemisphere-aware');
}

// Real GLB names (read from the file, sanitised like GLTFLoader does): every owned bone exists, secondary chains classify as expected.
{
  const bytes=await readFile(new URL('../public/assets/models/hsin/hsin-v2.0.glb',import.meta.url)),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const names=json.nodes.map(n=>sanitize(n.name??'')),set=new Set(names),parent=new Array(names.length).fill(-1);json.nodes.forEach((n,i)=>(n.children??[]).forEach(c=>parent[c]=i));
  const upper=['Spine1','Spine2','Neck','Head','ClavicleR','ClavicleL','UpperArmR','ForearmR','HandR','UpperArmL','ForearmL','HandL'],lower=['ThighL','CalfL','FootL','Toe0L','ThighR','CalfR','FootR','Toe0R'];
  for(const p of [...upper,...lower])for(const prefix of ['ORG-Bip001','DEF-Bip001'])assert.ok(set.has(prefix+p),'rig has '+prefix+p);
  const counts={};
  names.forEach((name,i)=>{const chain=[];for(let o=parent[i];o>=0;o=parent[o])chain.push(names[o]);const group=classifySecondary(name,chain);if(group)counts[group]=(counts[group]??0)+1;});
  assert.equal(counts.tail,10);assert.ok(counts.hair>=80,'hair bones: '+counts.hair);assert.ok(counts.sleeveL>=30&&Math.abs(counts.sleeveL-counts.sleeveR)<=2,'near-symmetric sleeve chains '+counts.sleeveL+'/'+counts.sleeveR);
  console.log('secondary bones by group',JSON.stringify(counts));
}
console.log('Moon Fox Reverie authoring: score at rest, C1 curves, bounded bow, five movements, secondary maths, spline vs linear, real rig names PASS');
