/**
 * Hsin Combat arm anatomy QA — every baked frame, both arms, real GLB skinning. Data only; no rendering.
 *   node scripts/qa-hsin-combat-arms.mjs ASSET.json OUT.json [LABEL]
 * Measures bone lengths (ORG and DEF), signed elbow flexion against the rig's own hinge, hinge-plane error, forearm
 * roll, wrist swing/twist, silhouette in three cameras, skinned arm surface stretch, clearances to torso / face /
 * opposite arm / hair, sleeve reach and temporal steps. Thresholds below are the R2.0.1 gate; they are reported, and
 * enforced by tests/hsin-combat-r201-anatomy.test.mjs.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {danceRig} from './lib/hsin-dance-rig.mjs';
import {decodeCombatData} from '../src/scripts/hsin-combat-data.mjs';
import {createCombatPose} from '../src/scripts/hsin-combat-pose.mjs';
import {SIDES,armNames,measureArmRest,armState,projectedChain,segmentDistance} from './lib/hsin-arm-anatomy.mjs';

export const ARM_GATE=Object.freeze({
 boneLengthMm:.5,orgDefGapMm:.5,hyperextensionDegrees:-1,maxFlexDegrees:150,hingeOffPlaneDegrees:6,forearmRollDegrees:8,forearmSwingOffHingeDegrees:8,
 wristSwingDegrees:55,wristTwistDegrees:45,pronationDegrees:80,wristBendOverRestDegrees:45,projectedWristBendDegrees:70,surfaceStretch:1.6,surfaceCompress:.6,surfaceMinRestEdgeMm:4,
 clavicleDegrees:20,stepDegrees:8,accelerationJumpDegrees:3,forearmTorsoClearanceMm:0,handFaceClearanceMm:15,armArmClearanceMm:0,
});
const DEG=180/Math.PI;

export async function auditArms(assetText,{label='asset'}={}){
 const r=await danceRig(),{T,model,by,meshes}=r;
 const data=decodeCombatData(JSON.parse(assetText)),pose=createCombatPose({T,data,bones:r.bones,model});
 model.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());
 const rest=Object.fromEntries(SIDES.map(s=>[s,measureArmRest(T,by,s)]));
 const up=new T.Vector3(0,1,0),lateral=rest.L.S.clone().sub(rest.R.S).setY(0).normalize(),forward=lateral.clone().cross(up).normalize();
 const chest=rest.R.S.clone().add(rest.L.S).multiplyScalar(.5).addScaledVector(up,-.15);
 const cameras=Object.fromEntries([['front',0],['threeQuarter',45],['profile',90]].map(([k,yaw])=>{const c=new T.PerspectiveCamera(34,1,.03,45),dir=forward.clone().applyAxisAngle(up,yaw/DEG);c.position.copy(chest).addScaledVector(dir,3).addScaledVector(up,.1);c.lookAt(chest);c.updateMatrixWorld();c.updateProjectionMatrix();return [k,c];}));
 // Skinned samples, chosen once in the reference pose.
 const arm={R:new Map(),L:new Map()},torso=[],face=[],hair=[],sleeve={R:[],L:[]},armTriangles={R:[],L:[]};
 const armBone={R:/^(DEF-Bip001(UpperArm|Forearm)R(001)?|ORG-Bip001HandR)$/,L:/^(DEF-Bip001(UpperArm|Forearm)L(001)?|ORG-Bip001HandL)$/};
 const v=new T.Vector3();
 for(const mesh of meshes){
  const g=mesh.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,count=g.attributes.position.count;
  for(let i=0;i<count;i++){
   let top=null,armW={R:0,L:0},trunk=0,head=0,hairW=0;
   for(let k=0;k<4;k++){const name=mesh.skeleton.bones[si.getComponent(i,k)]?.name??'',w=sw.getComponent(i,k);if(!top||w>top.w)top={w,name};
    for(const s of SIDES)if(armBone[s].test(name))armW[s]+=w;
    if(/^(ORG|DEF)-Bip001(Spine\d?|Pelvis)$/.test(name))trunk+=w;if(/^(ORG|DEF)-Bip001(Head|Neck)$/.test(name))head+=w;if(/Hair/.test(name))hairW+=w;}
   const p=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld);
   for(const s of SIDES)if(armW[s]>.6)arm[s].set(mesh.uuid+':'+i,{mesh,i,p});
   if(trunk>.7&&i%2===0)torso.push({mesh,i});if(head>.7)face.push({mesh,i});if(hairW>.7&&i%6===0)hair.push({mesh,i});
   if(/Piao/.test(top.name))for(const s of SIDES){const a=rest[s];if(Math.min(segmentDistance(T,a.S,a.E,p,p),segmentDistance(T,a.E,a.W,p,p))<.12&&Math.sign(p.dot(lateral)-chest.dot(lateral))===(s==='L'?1:-1))sleeve[s].push({mesh,i});}
  }
  const index=g.index?.array??Array.from({length:count},(_,i)=>i);
  for(const s of SIDES)for(let k=0;k<index.length;k+=3){const ids=[index[k],index[k+1],index[k+2]];if(ids.every(id=>arm[s].has(mesh.uuid+':'+id)))armTriangles[s].push({mesh,ids,rest:[0,1,2].map(j=>arm[s].get(mesh.uuid+':'+ids[j]).p.distanceTo(arm[s].get(mesh.uuid+':'+ids[(j+1)%3]).p))});}
 }
 const sample=(x,out)=>x.mesh.getVertexPosition(x.i,out).applyMatrix4(x.mesh.matrixWorld);
 const restWristBend=Object.fromEntries(SIDES.map(s=>[s,armState(T,by,rest[s]).wristBendDegrees]));
 const spine=by.get('ORG-Bip001Spine2'),spineRest=spine.getWorldQuaternion(new T.Quaternion());
 const N=data.frameCount,per={R:[],L:[]},previous={R:null,L:null};
 const surface=Object.fromEntries(['R','L'].map(s=>[s,{maxStretch:1,minCompress:1,at:null,compressAt:null,edges:0,over:0,tiny:{maxStretch:1,minCompress:1,at:null,compressAt:null}}]));
 const chain=s=>{const n=armNames(s);return ['upper','fore','hand','defFore2'].map(k=>by.get(n[k]));};
 for(let f=0;f<N;f++){
  pose.apply(f/(N-1));model.updateMatrixWorld(true);meshes.forEach(m=>m.skeleton.update());
  const D=spine.getWorldQuaternion(new T.Quaternion()).multiply(spineRest.clone().invert()),fwdNow=forward.clone().applyQuaternion(D);
  const spineYaw=Math.atan2(fwdNow.clone().cross(forward).dot(up),fwdNow.dot(forward))*-DEG;
  const states=Object.fromEntries(SIDES.map(s=>[s,armState(T,by,rest[s])]));
  for(const s of SIDES){
   const st=states[s],o=states[s==='R'?'L':'R'];
   const views=Object.fromEntries(Object.entries(cameras).map(([k,c])=>[k,projectedChain(T,st,c)]));
   // Clearances (millimetres, minus nominal radii: forearm 30 mm, hand 25 mm, upper arm 35 mm).
   let torsoMin=Infinity,faceMin=Infinity,hairMin=Infinity;
   for(const x of torso){sample(x,v);torsoMin=Math.min(torsoMin,segmentDistance(T,st.E,st.W,v,v)-.03,segmentDistance(T,st.W,st.tip,v,v)-.025);}
   for(const x of face){sample(x,v);faceMin=Math.min(faceMin,segmentDistance(T,st.W,st.tip,v,v)-.025,segmentDistance(T,st.E,st.W,v,v)-.03);}
   for(const x of hair){sample(x,v);hairMin=Math.min(hairMin,segmentDistance(T,st.W,st.tip,v,v)-.025);}
   const armArm=Math.min(segmentDistance(T,st.E,st.W,o.E,o.W)-.06,segmentDistance(T,st.W,st.tip,o.W,o.tip)-.05,segmentDistance(T,st.W,st.tip,o.E,o.W)-.055,segmentDistance(T,st.E,st.W,o.S,o.E)-.065);
   let sleeveReach=0;const fl=st.E.distanceTo(st.W),fd=st.W.clone().sub(st.E).normalize();for(const x of sleeve[s]){sample(x,v);sleeveReach=Math.max(sleeveReach,v.clone().sub(st.E).dot(fd)/fl);}
   // Surface: edge stretch of triangles fully skinned to this arm.
   // Edges shorter than 4 mm at rest (seams, eyelets, welded borders) are reported separately: their ratios explode
   // for sub-millimetre motion and say nothing about a visibly stretched limb.
   if(f%2===0)for(const tri of armTriangles[s]){const pts=tri.ids.map(id=>tri.mesh.getVertexPosition(id,new T.Vector3()).applyMatrix4(tri.mesh.matrixWorld));for(let j=0;j<3;j++){const ratio=pts[j].distanceTo(pts[(j+1)%3])/Math.max(1e-6,tri.rest[j]),big=tri.rest[j]*1000>=ARM_GATE.surfaceMinRestEdgeMm,bucket=big?surface[s]:surface[s].tiny;if(ratio>bucket.maxStretch){bucket.maxStretch=ratio;bucket.at=f;}if(ratio<bucket.minCompress){bucket.minCompress=ratio;bucket.compressAt=f;}if(big){surface[s].edges++;if(ratio>1.3||ratio<.75)surface[s].over++;}}}
   const qs=chain(s).map(b=>b.getWorldQuaternion(new T.Quaternion()));
   let step=0,jump=0;if(previous[s]){qs.forEach((q,i)=>{const d=q.angleTo(previous[s].q[i])*DEG;step=Math.max(step,d);jump=Math.max(jump,Math.abs(d-previous[s].d[i]));});}
   previous[s]={q:qs,d:previous[s]?qs.map((q,i)=>q.angleTo(previous[s].q[i])*DEG):qs.map(()=>0)};
   per[s].push({f,t:+(f/30).toFixed(3),spineYaw:+spineYaw.toFixed(2),lengthDeltaMm:Object.fromEntries(Object.entries(st.lengthDeltaMm).map(([k,x])=>[k,+x.toFixed(4)])),orgDefGapMm:+st.orgDefGapMm.toFixed(4),
    signedFlex:+st.signedFlexDegrees.toFixed(2),hingeOffPlane:+st.hingeOffPlaneDegrees.toFixed(2),forearmRoll:+st.forearmTwistDegrees.toFixed(2),forearmSwingOffHinge:+st.forearmSwingOffHingeDegrees.toFixed(2),
    wristSwing:+st.wristSwingDegrees.toFixed(2),wristTwist:+st.wristTwistDegrees.toFixed(2),pronation:+st.pronationDegrees.toFixed(2),distalForearmTwist:+st.distalForearmTwistDegrees.toFixed(2),wristBend:+st.wristBendDegrees.toFixed(2),
    clavicle:+st.clavicleDegrees.toFixed(2),elevation:+st.elevationDegrees.toFixed(2),
    projected:Object.fromEntries(Object.entries(views).map(([k,x])=>[k,{elbow:x.elbowVisible?+x.elbowBend.toFixed(1):null,wrist:x.wristVisible?+x.wristBend.toFixed(1):null,turn:x.elbowTurn,foreshortening:x.foreshortening.map(y=>+y.toFixed(2))}])),
    clearanceMm:{torso:+(torsoMin*1000).toFixed(1),face:+(faceMin*1000).toFixed(1),hair:+(hairMin*1000).toFixed(1),oppositeArm:+(armArm*1000).toFixed(1)},sleeveReach:+sleeveReach.toFixed(3),stepDegrees:+step.toFixed(3),jumpDegrees:+jump.toFixed(3)});
  }
 }
 pose.restore();model.updateMatrixWorld(true);
 const G=ARM_GATE,checks=[
  ['bone length',x=>Math.max(...Object.values(x.lengthDeltaMm).map(Math.abs))>G.boneLengthMm,'shoulder/elbow'],
  ['ORG/DEF gap',x=>x.orgDefGapMm>G.orgDefGapMm,'chain'],
  ['clavicle',x=>x.clavicle>G.clavicleDegrees,'clavicle'],
  ['elbow hyperextension',x=>x.signedFlex<G.hyperextensionDegrees,'elbow'],
  ['elbow over-flexion',x=>x.signedFlex>G.maxFlexDegrees,'elbow'],
  ['elbow off its hinge plane',x=>x.hingeOffPlane>G.hingeOffPlaneDegrees,'elbow'],
  ['forearm roll',x=>Math.abs(x.forearmRoll)>G.forearmRollDegrees||x.forearmSwingOffHinge>G.forearmSwingOffHingeDegrees,'elbow'],
  ['wrist swing',x=>x.wristSwing>G.wristSwingDegrees,'wrist'],
  ['wrist twist over forearm skin',x=>Math.abs(x.wristTwist)>G.wristTwistDegrees,'wrist'],
  ['pronation range',x=>Math.abs(x.pronation)>G.pronationDegrees,'forearm'],
  ['hand not continuing forearm',(x,s)=>x.wristBend-restWristBend[s]>G.wristBendOverRestDegrees,'wrist'],
  ['projected hanging wrist',x=>Object.values(x.projected).some(p=>p.wrist!==null&&p.wrist>G.projectedWristBendDegrees),'wrist'],
  ['forearm into torso',x=>x.clearanceMm.torso<G.forearmTorsoClearanceMm,'collision'],
  ['hand into face',x=>x.clearanceMm.face<G.handFaceClearanceMm,'collision'],
  ['arm into arm',x=>x.clearanceMm.oppositeArm<G.armArmClearanceMm,'collision'],
  ['temporal step',x=>x.stepDegrees>G.stepDegrees||x.jumpDegrees>G.accelerationJumpDegrees,'temporal'],
 ];
 const summary={};
 for(const s of SIDES){
  const rows=per[s],fails={};let first=null;
  for(const [name,test,joint] of checks){const hit=rows.filter(x=>test(x,s));fails[name]={frames:hit.length,first:hit[0]?.t??null,joint};if(hit.length&&(!first||hit[0].f<first.f))first={check:name,joint,f:hit[0].f,t:hit[0].t};}
  const max=k=>rows.reduce((m,x)=>Math.max(m,typeof k==='function'?k(x):x[k]),-Infinity),min=k=>rows.reduce((m,x)=>Math.min(m,typeof k==='function'?k(x):x[k]),Infinity);
  const worst=rows.reduce((a,b)=>b.hingeOffPlane+Math.max(0,-b.signedFlex)*2+Math.abs(b.forearmRoll)>a.hingeOffPlane+Math.max(0,-a.signedFlex)*2+Math.abs(a.forearmRoll)?b:a);
  summary[s]={firstDeformation:first,fails,
   maxBoneLengthDeltaMm:max(x=>Math.max(...Object.values(x.lengthDeltaMm).map(Math.abs))),maxOrgDefGapMm:max('orgDefGapMm'),
   flexRange:[min('signedFlex'),max('signedFlex')],maxHingeOffPlane:max('hingeOffPlane'),maxForearmRoll:max(x=>Math.abs(x.forearmRoll)),maxForearmSwingOffHinge:max('forearmSwingOffHinge'),
   maxWristSwing:max('wristSwing'),maxWristTwist:max(x=>Math.abs(x.wristTwist)),maxWristBendOverRest:max(x=>x.wristBend-restWristBend[s]),restWristBend:restWristBend[s],
   maxProjectedWrist:max(x=>Math.max(0,...Object.values(x.projected).map(p=>p.wrist??0))),maxPronation:max(x=>Math.abs(x.pronation)),
   torsoYawCorrelation:(()=>{const a=rows.map(x=>Math.abs(x.spineYaw)),b=rows.map(x=>x.hingeOffPlane+Math.max(0,-x.signedFlex));const ma=a.reduce((p,c)=>p+c,0)/a.length,mb=b.reduce((p,c)=>p+c,0)/b.length;let sab=0,sa=0,sb=0;a.forEach((v,i)=>{sab+=(v-ma)*(b[i]-mb);sa+=(v-ma)**2;sb+=(b[i]-mb)**2;});return sa&&sb?+(sab/Math.sqrt(sa*sb)).toFixed(3):0;})(),
   perspectiveVsAnatomy:(()=>{const rowsV=rows.filter(x=>x.projected.front.elbow!==null);const diff=rowsV.map(x=>Math.abs(x.projected.front.elbow-Math.max(0,x.signedFlex)));return {frontFramesComparable:rowsV.length,maxDifferenceDegrees:diff.length?+Math.max(...diff).toFixed(1):null};})(),maxClavicle:max('clavicle'),maxElevation:max('elevation'),
   minClearanceMm:{torso:min(x=>x.clearanceMm.torso),face:min(x=>x.clearanceMm.face),hair:min(x=>x.clearanceMm.hair),oppositeArm:min(x=>x.clearanceMm.oppositeArm)},
   maxSleeveReach:max('sleeveReach'),maxStep:max('stepDegrees'),maxJump:max('jumpDegrees'),surface:surface[s],
   worstFrame:{t:worst.t,spineYaw:worst.spineYaw,signedFlex:worst.signedFlex,hingeOffPlane:worst.hingeOffPlane,forearmRoll:worst.forearmRoll,wristSwing:worst.wristSwing,projected:worst.projected},
   samples:{arm:arm[s].size,triangles:armTriangles[s].length,sleeve:sleeve[s].length,torso:torso.length,face:face.length,hair:hair.length}};
 }
 return {schema:'hsin.combat.arm-anatomy/1',label,assetSha256:createHash('sha256').update(assetText).digest('hex'),revision:JSON.parse(assetText).revision??'r2',frames:N,gate:ARM_GATE,
  method:'All baked frames on the real GLB rig and skinning; positions in model world space; clearances minus nominal limb radii; not a render or an artistic verdict.',
  summary,perFrame:per};
}

if(import.meta.url===`file://${process.argv[1]}`){
 const [asset,out,label]=process.argv.slice(2);
 if(!asset||!out)throw Error('Usage: node scripts/qa-hsin-combat-arms.mjs ASSET.json OUT.json [LABEL]');
 const result=await auditArms(await readFile(asset,'utf8'),{label:label??asset});
 await writeFile(out,JSON.stringify(result)+'\n');
 console.log(JSON.stringify({label:result.label,revision:result.revision,summary:Object.fromEntries(Object.entries(result.summary).map(([s,x])=>[s,{...x,fails:Object.fromEntries(Object.entries(x.fails).filter(([,y])=>y.frames))}]))},null,1));
}
