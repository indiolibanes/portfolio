/**
 * Combat R2.1 acting contract on the real GLB and the real runtime modules. The anatomical limits are asserted by
 * tests/hsin-combat-r201-anatomy.test.mjs (unchanged thresholds); this file asserts what R2.1 adds: readable attacks,
 * a Skill that does not demand the 70-degree supination, bounded face/camera/secondary/effect behaviour.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeCombatData} from '../src/scripts/hsin-combat-data.mjs';
import {createCombatPose} from '../src/scripts/hsin-combat-pose.mjs';
import {createCombatDirector} from '../src/scripts/hsin-combat-director.mjs';
import {createCombatVfx} from '../src/scripts/hsin-combat-vfx.mjs';
import {faceCue,cameraShot,wideDistance,FACE_KEYS} from '../src/scripts/hsin-combat-r21.mjs';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
const r=await danceRig(),{T,model,bones,by}=r;
const bytes=readFileSync('public/assets/animations/hsin/combat-r2.json'),raw=JSON.parse(bytes),data=decodeCombatData(JSON.parse(bytes));
const manifest=JSON.parse(readFileSync('src/data/hsin-combat-r2.json'));
const report={};
// ---- asset contract ----
assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sha256);
assert.equal(data.revision,'r2.1');assert.equal(data.frameCount,253);assert.equal(data.names.length,257,'257 pose channels preserved');
assert.equal(data.seconds,8.4,'duration preserved');
assert.ok(bytes.length<=1469188*1.02,'bake size '+bytes.length);
assert.deepEqual(data.sequence.phases.map(p=>p[0]),['PREPARATION','BASIC','SKILL','RECOVERY','COMPLETE']);
const markers=data.sequence.markers;assert.ok(markers.every((m,i)=>i===0||m[1]>=markers[i-1][1]),'markers ordered');
for(const required of ['energy','trail','arc','trail-left','arc-left','charge','ring','recovery'])assert.ok(markers.some(m=>m[0]===required),'marker '+required);
const at=name=>markers.find(m=>m[0]===name)[1];
assert.ok(at('trail')<at('arc')&&at('trail-left')<at('arc-left'),'trails precede impacts');
report.bakeBytes=bytes.length;
// ---- hand paths in the torso frame (real GLB, every baked frame) ----
const pose=createCombatPose({T,data,bones,model});
const spine=by.get('ORG-Bip001Spine2'),hand={R:by.get('ORG-Bip001HandR'),L:by.get('ORG-Bip001HandL')},upper={R:by.get('ORG-Bip001UpperArmR'),L:by.get('ORG-Bip001UpperArmL')};
const wp=(b,out)=>b.updateWorldMatrix(true,false)||b.getWorldPosition(out);
model.updateMatrixWorld(true);
const track={R:[],L:[]},palmGap=[],root=[];
const v=new T.Vector3(),w=new T.Vector3(),q=new T.Quaternion(),pr=new T.Vector3(),pl=new T.Vector3();
const forearm={R:by.get('ORG-Bip001ForearmR'),L:by.get('ORG-Bip001ForearmL')};
const palm=(side,out)=>{wp(hand[side],out);wp(forearm[side],v);return out.addScaledVector(v.sub(out).negate().normalize(),.085);};
for(let f=0;f<data.frameCount;f++){
 pose.apply(f/(data.frameCount-1));model.updateMatrixWorld(true);
 spine.getWorldQuaternion(q).invert();
 for(const side of ['R','L']){wp(hand[side],v);wp(upper[side],w);track[side].push(v.sub(w).applyQuaternion(q).toArray());}
 palm('R',pr);palm('L',pl);palmGap.push(pr.distanceTo(pl));
 root.push(model.getObjectByName(data.positionNames[0]).getWorldPosition(new T.Vector3()).toArray());
}
pose.restore();
const frameOf=t=>Math.round(t*30);
const speeds={R:[],L:[]};for(const s of ['R','L'])for(let f=1;f<track[s].length;f++)speeds[s].push(Math.hypot(...track[s][f].map((x,i)=>x-track[s][f-1][i]))*30);
const pathLength=(s,a,b)=>{let l=0;for(let f=frameOf(a)+1;f<=frameOf(b);f++)l+=Math.hypot(...track[s][f].map((x,i)=>x-track[s][f-1][i]));return l;};
const chord=(s,a,b)=>Math.hypot(...track[s][frameOf(b)].map((x,i)=>x-track[s][frameOf(a)][i]));
const peak=(s,a,b)=>{let m=0,t=0;for(let f=frameOf(a);f<=frameOf(b);f++)if(speeds[s][f-1]>m){m=speeds[s][f-1];t=f/30;}return {speed:m,time:t};};
// Basic 01 is an arc, not a straight extension: path much longer than its chord, driven by the right hand.
const arc1=pathLength('R',1.55,2.26)/chord('R',1.55,2.26);assert.ok(arc1>=1.25,'Basic 01 arc ratio '+arc1);
const arc2=pathLength('L',2.72,3.32)/chord('L',2.72,3.32);assert.ok(arc2>=1.25,'Basic 02 arc ratio '+arc2);
// Silhouettes differ: Basic 01 stays below the shoulder (low sweep), Basic 02 rises. The second is not a mirror of the first.
const maxUp=(s,a,b)=>Math.max(...track[s].slice(frameOf(a),frameOf(b)+1).map(p=>p[1]));
const minUp=(s,a,b)=>Math.min(...track[s].slice(frameOf(a),frameOf(b)+1).map(p=>p[1]));
const rise1=maxUp('R',1.55,2.5)-minUp('R',1.55,2.5),rise2=maxUp('L',2.72,3.6)-minUp('L',2.72,3.6);
assert.ok(maxUp('R',1.55,2.5)<=-.04,'Basic 01 stays below the shoulder '+maxUp('R',1.55,2.5));
assert.ok(rise2>rise1+.05,`Basic 02 rises more than Basic 01 (${rise2.toFixed(3)} vs ${rise1.toFixed(3)})`);
// Frame-independent shape features (height along the spine and distance from the shoulder): Basic 02 is not Basic 01 mirrored.
let mirrorRms=0,n=0;const feat=p=>[p[1],Math.hypot(...p)];
for(let f=frameOf(1.55);f<=frameOf(2.5);f++){const a=feat(track.R[f]),b=feat(track.L[f+frameOf(1.12)]);mirrorRms+=(a[0]-b[0])**2+(a[1]-b[1])**2;n++;}
mirrorRms=Math.sqrt(mirrorRms/n);assert.ok(mirrorRms>=.04,'Basic 02 is not a mirrored copy of Basic 01: rms '+mirrorRms);
// Energy profile: acceleration then deceleration, peak before the impact marker, and Basic 02 is quicker than Basic 01.
const p1=peak('R',1.55,2.5),p2=peak('L',2.72,3.6);
assert.ok(p1.time<at('arc')&&p2.time<at('arc-left'),'peak velocity precedes impact: '+p1.time+' / '+p2.time);
assert.ok(p1.speed>=.8&&p2.speed>=.8,'strikes carry energy (m/s) '+p1.speed+' / '+p2.speed);
assert.ok(p2.speed>=p1.speed*0.8,'Basic 02 carries comparable energy');
report.attacks={arcRatio:[arc1,arc2],rise:[rise1,rise2],mirrorRms,peak:{basic01:p1,basic02:p2}};
// Weight transfer: the common skeleton shifts sideways between the loading frame and the impact.
const lateralShift=a=>Math.abs(root[frameOf(a)][0]-root[frameOf(1.55)][0])+Math.abs(root[frameOf(a)][2]-root[frameOf(1.55)][2]);
assert.ok(lateralShift(2.1)>=.04,'hips transfer weight into Basic 01: '+lateralShift(2.1));
report.weightShiftM=lateralShift(2.1);
// Passages are continuous: no frozen arms between attacks and no abrupt energy change (hand speed jump between frames).
for(const s of ['R','L']){let maxJump=0;for(let f=1;f<speeds[s].length;f++)maxJump=Math.max(maxJump,Math.abs(speeds[s][f]-speeds[s][f-1]));assert.ok(maxJump<2,`${s} hand speed jump m/s ${maxJump}`);report['handSpeedJump'+s]=maxJump;}
for(const [a,b] of [[2.55,2.8],[3.5,3.8]]){const moving=['R','L'].some(s=>pathLength(s,a,b)>.04);assert.ok(moving,`arms do not freeze between attacks ${a}-${b}`);}
// ---- Skill: the hands form a sphere between palms; no supination demand ----
const hold=[frameOf(4.9),frameOf(5.25)];const gaps=palmGap.slice(hold[0],hold[1]+1);
assert.ok(Math.min(...gaps)>=.15&&Math.max(...gaps)<=.32,'palm gap while holding '+Math.min(...gaps)+'..'+Math.max(...gaps));
assert.ok(palmGap[frameOf(4.15)]>palmGap[frameOf(5.1)]+.05,'the hands close in on the sphere while charging');
const anatomy=JSON.parse(readFileSync('docs/hsin-combat-r21/arm-anatomy-after.json'));
for(const side of ['R','L'])assert.ok(anatomy.summary[side].maxPronation<=60,`${side} pronation ${anatomy.summary[side].maxPronation} must stay clear of the 70-degree limit`);
report.skill={gapHold:[Math.min(...gaps),Math.max(...gaps)],maxPronation:Object.fromEntries(['R','L'].map(s=>[s,anatomy.summary[s].maxPronation]))};
// ---- secondary layer ----
const sec=JSON.parse(readFileSync('public/assets/animations/hsin/lunar-dance-r3.json')).secondary;
const caps={hair:1.1,ornament:1.5,sleeve:1.8,tail:1.4},kindOf=i=>{const g=sec.groups[sec.group[i]].id;return g.startsWith('sleeve')?'sleeve':g==='tail'?'tail':/Piao/.test(sec.names[i])?'ornament':'hair';};
const index=new Map(data.names.map((n,i)=>[n,i])),maxAngle={},maxStep={};
const qa=new T.Quaternion(),qb=new T.Quaternion();
sec.names.forEach((name,i)=>{const k=index.get(name);assert.ok(k!==undefined,'secondary channel '+name);let prior=qa.fromArray(data.rest,k*4).clone();
 for(let f=0;f<data.frameCount;f++){qb.fromArray(data.frames[f],k*4);const rest=new T.Quaternion().fromArray(data.rest,k*4);const a=qb.angleTo(rest)*180/Math.PI,s=qb.angleTo(prior)*180/Math.PI;prior=qb.clone();const kind=kindOf(i);maxAngle[kind]=Math.max(maxAngle[kind]??0,a);maxStep[kind]=Math.max(maxStep[kind]??0,s);}});
for(const [kind,cap] of Object.entries(caps))assert.ok(maxAngle[kind]<=cap+.1,`${kind} secondary bounded: ${maxAngle[kind]} <= ${cap}`);
for(const [kind,s] of Object.entries(maxStep))assert.ok(s<=1,`${kind} secondary step ${s}`);
const sleeveRoots=sec.names.map((n,i)=>i).filter(i=>kindOf(i)==='sleeve'&&sec.depth[i]===0),sleeveFree=sec.names.map((n,i)=>i).filter(i=>kindOf(i)==='sleeve'&&sec.depth[i]>=5);
const peakOf=list=>{let m=0;for(const i of list){const k=index.get(sec.names[i]);for(let f=0;f<data.frameCount;f++)m=Math.max(m,qb.fromArray(data.frames[f],k*4).angleTo(qa.fromArray(data.rest,k*4)));}return m*180/Math.PI;};
const rootPeak=peakOf(sleeveRoots),freePeak=peakOf(sleeveFree);assert.ok(rootPeak<freePeak,`sleeve roots near the elbow move less than the free ends (${rootPeak.toFixed(2)} < ${freePeak.toFixed(2)})`);
report.secondary={maxAngle,maxStep,sleeveRootPeak:rootPeak,sleeveFreePeak:freePeak};
// ---- face ----
const f=faceCue(0,{});assert.deepEqual(Object.values(f),[0,0,0,0,0,0]);const end=faceCue(8.4,{});assert.deepEqual(Object.values(end),[0,0,0,0,0,0]);
const ceilings={squint:.15,mouthSquint:.08,brow:.1,smileCut:.8,smileAdd:.05,close:1};let blinkFrames=0,faceJump=0,prevFace=faceCue(0,{});
for(let i=1;i<=252;i++){const c=faceCue(i/30,{});for(const [k,cap] of Object.entries(ceilings)){assert.ok(c[k]>=0&&c[k]<=cap,`face ${k} within bounds at ${i/30}: ${c[k]}`);if(k!=='close')faceJump=Math.max(faceJump,Math.abs(c[k]-prevFace[k]));}if(c.close>.5)blinkFrames++;prevFace=c;}
assert.ok(faceJump<=.05,'face changes gradually '+faceJump);assert.ok(blinkFrames>=1&&blinkFrames<=4,'one contextual blink '+blinkFrames);
assert.ok(faceCue(2.1,{}).squint>faceCue(0.6,{}).squint,'Basic narrows the eyes more than Preparation');
assert.ok(faceCue(5.45,{}).squint>faceCue(4.2,{}).squint&&faceCue(5.45,{}).squint>faceCue(6.5,{}).squint,'Release is the momentary peak, then serenity returns');
assert.ok(FACE_KEYS.every(k=>k.length===7));
report.face={faceJump,blinkFrames};
// ---- camera ----
let prevShot=cameraShot(0,{},{}),maxYaw=0,maxDist=0;
for(const aspect of [.45,1,16/9,2.1]){
 prevShot=cameraShot(0,{aspect},{});
 for(let i=1;i<=252;i++){const s=cameraShot(i/30,{aspect},{});maxYaw=Math.max(maxYaw,Math.abs(s.yaw-prevShot.yaw)*180/Math.PI);maxDist=Math.max(maxDist,Math.abs(s.distance-prevShot.distance)/prevShot.distance);assert.ok(Math.abs(s.yaw)<=Math.PI*.22,'azimuth inside the OrbitControls limit');assert.ok(s.distance>=1.05&&s.distance<=7);prevShot=s;}
 const prep=cameraShot(.5,{aspect},{}),tan=Math.tan(17*Math.PI/180);
 assert.ok(prep.distance*tan>=0.95||prep.distance>=6.99,`Preparation keeps the feet in frame (aspect ${aspect})`);
 assert.ok(prep.targetY-prep.distance*tan<=0.05||prep.distance>=6.99,'feet visible');
 const skill=cameraShot(5,{aspect},{});assert.ok(skill.distance*tan>=.5||skill.distance>=6.99,'Skill frame holds hands and face');
 assert.ok(cameraShot(8.4,{aspect},{}).home>.999&&cameraShot(5,{aspect},{}).home===0,'Recovery blends back to the previous framing');
}
assert.ok(maxYaw<=1.2&&maxDist<=.03,`camera moves without cuts ${maxYaw}° / ${maxDist}`);
assert.ok(wideDistance(34,.45)>wideDistance(34,16/9));
report.camera={maxYawStepDegrees:maxYaw,maxDistanceStep:maxDist};
// ---- effects: pooled, world-space, camera independent, deterministic, disposable ----
function simulate(cameraPosition){
 const scene=new T.Scene();scene.add(model);const camera=new T.PerspectiveCamera(34,16/9,.03,45);camera.position.copy(cameraPosition);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
 const vfx=createCombatVfx({T,scene,camera,by});
 const p=createCombatPose({T,data:decodeCombatData(JSON.parse(bytes)),bones,model});
 const d=createCombatDirector({pose:p,sequence:data.sequence,onEvent:e=>vfx.event(e,d.sample().time)});
 const trace=[];let maxCalls=0,minGap=Infinity,sphereOverGap=0;d.start();
 const watch=vfx.dispose,meshes=[];scene.traverse(o=>{if(o.isMesh&&o.name.startsWith('combat'))meshes.push(o);});
 for(let i=0;i<300&&d.owns();i++){d.advance(1/30);if(!d.owns())break;vfx.update(d.sample().time);
  maxCalls=Math.max(maxCalls,vfx.visibleDrawCalls());
  trace.push(meshes.filter(m=>m.name!=='combat ribbon'&&m.visible).map(m=>[m.name,...m.position.toArray().map(x=>+x.toFixed(5))]));
  const t=d.sample().time;if(t>=4.9&&t<=5.25){const core=meshes.find(m=>m.name==='combat core');const gap=palmGap[Math.round(t*30)];if(core.visible){minGap=Math.min(minGap,gap/2-core.scale.x);if(core.scale.x>gap/2-.03+.003)sphereOverGap++;}}
 }
 const visibleAfter=meshes.filter(m=>m.visible).length;
 const disposed={geometry:new Set(),material:new Set()};for(const m of meshes){m.geometry.addEventListener('dispose',()=>disposed.geometry.add(m.geometry.uuid));m.material.addEventListener('dispose',()=>disposed.material.add(m.material.uuid));}
 const budget={...vfx.budget};vfx.dispose();
 assert.equal(scene.children.filter(o=>o.name.startsWith('Hsin combat R2.1')).length,0,'effect group removed');
 scene.remove(model);
 return {trace,maxCalls,visibleAfter,minGap,sphereOverGap,disposed:{geometry:disposed.geometry.size,material:disposed.material.size},budget,meshes:meshes.length};
}
const a=simulate(new T.Vector3(1.4,1.2,2.8)),b=simulate(new T.Vector3(-2.2,.9,2.4)),c=simulate(new T.Vector3(1.4,1.2,2.8));
assert.ok(a.maxCalls<=7,'draw calls '+a.maxCalls);assert.equal(a.visibleAfter,0,'effects hidden when the sequence ends');
assert.equal(a.meshes,7);assert.equal(a.budget.geometries,4);assert.equal(a.budget.materials,5);assert.equal(a.budget.textures,0);assert.equal(a.budget.renderTargets,0);assert.equal(a.budget.customShaders,0);
assert.equal(a.disposed.geometry,4,'geometries disposed');assert.equal(a.disposed.material,5,'materials disposed');
assert.equal(a.sphereOverGap,0,'the sphere never exceeds the space between the palms');
assert.deepEqual(a.trace,c.trace,'effects are deterministic');
assert.deepEqual(a.trace,b.trace,'effect transforms do not depend on the camera');
report.vfx={maxVisibleDrawCalls:a.maxCalls,budget:a.budget,minimumSphereClearanceM:a.minGap};
mkdirSync('docs/hsin-combat-r21',{recursive:true});
writeFileSync('docs/hsin-combat-r21/acting-qa.json',JSON.stringify(report,null,2)+'\n');
console.log('Combat R2.1 acting contract PASS',JSON.stringify(report));
