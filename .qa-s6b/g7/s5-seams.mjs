/** S6-B: inspect exactly the six clip joins displayed by S5/R6.2.3.
 * Diagnostic only. Never modifies source clips, the approved score or the runtime.
 * World coordinates: model world. Rotations: degrees. Positions: scene units (not automatically metres).
 */
import { buildR61Plan, R61_SOURCE_IDS } from '../../src/scripts/shorekeeper/r61-plan.mjs';
import { createComboSequencer, clipTimeAt } from '../../src/scripts/shorekeeper/combo-sequencer.mjs';

const RIG_NAMES = Object.freeze(['Root','Bip001','Bip001Pelvis','Bip001LFoot','Bip001RFoot']);
const BURST = 'SK_BURST_02_ORIGINAL';
export const S6B_STATUS = 'G7_NUMERIC_ONLY_VISUAL_AND_SOURCEFRAME_PENDING';

function modelBones(model) {
  const all=[];
  model.traverse(o => { if (o.isBone) all.push(o); });
  const names=new Set();
  for (const bone of all) { if (names.has(bone.name)) throw Error('Duplicate bone name: '+bone.name); names.add(bone.name); }
  for (const name of RIG_NAMES) if (!names.has(name)) throw Error('Missing G7 landmark: '+name);
  return all;
}
function capture(T, model, bones) {
  model.updateMatrixWorld(true);
  const local=bones.map(b=>({name:b.name,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
  const world={};
  for (const name of RIG_NAMES) {
    const bone=bones.find(b=>b.name===name),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();
    bone.matrixWorld.decompose(p,q,s);
    if (![...p.toArray(),...q.toArray()].every(Number.isFinite)) throw Error('Non-finite G7 landmark');
    world[name]={p,q};
  }
  return {local,world};
}
function restore(model,bones,rest) {
  bones.forEach((b,i)=>{b.position.copy(rest.local[i].p);b.quaternion.copy(rest.local[i].q);b.scale.copy(rest.local[i].s);});
  model.updateMatrixWorld(true);
}
const degrees=r=>r*180/Math.PI;
const angle=(a,b)=>degrees(2*Math.acos(Math.min(1,Math.abs(a.dot(b)))));
function yaw(T,q) { const f=new T.Vector3(0,0,1).applyQuaternion(q);return Math.hypot(f.x,f.z)<1e-7?null:degrees(Math.atan2(f.x,f.z)); }
const wrap=d=>((d+540)%360)-180;
function compare(T,a,b,driven) {
  let mean=0,n=0,max=0,maxBone=null;
  const local=[];
  a.local.forEach((v,i)=>{if (!driven.has(v.name)) return; const d=angle(v.q,b.local[i].q);n++;mean+=d;if(d>max){max=d;maxBone=v.name;}local.push({name:v.name,deg:d});});
  const world={};
  for (const name of RIG_NAMES) {
    const p=a.world[name],q=b.world[name],ay=yaw(T,p.q),by=yaw(T,q.q);
    world[name]={delta:q.p.clone().sub(p.p).toArray().map(x=>+x.toFixed(6)),step:+p.p.distanceTo(q.p).toFixed(6),
      rotationDeg:+angle(p.q,q.q).toFixed(4),yawDeltaDeg:ay===null||by===null?null:+wrap(by-ay).toFixed(4)};
  }
  return {meanLocalDeg:n?+(mean/n).toFixed(4):0,maxLocalDeg:+max.toFixed(4),maxLocalBone:maxBone,
    topLocal:local.sort((a,b)=>b.deg-a.deg).slice(0,6).map(x=>({name:x.name,deg:+x.deg.toFixed(4)})),world};
}
function singlePose(T,model,bones,rest,clip,time) {
  restore(model,bones,rest);
  const mixer=new T.AnimationMixer(model),action=mixer.clipAction(clip);
  try {
    action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();action.paused=true;
    action.time=Math.min(clip.duration,Math.max(0,time));mixer.update(0);
    return capture(T,model,bones);
  } finally {mixer.stopAllAction();mixer.uncacheRoot(model);}
}
function timesFor(schedule,fps) {
  const points=new Set([0,schedule.duration]);
  for(let k=0;k<=Math.ceil(schedule.duration*fps);k++)points.add(Math.min(schedule.duration,k/fps).toFixed(8));
  for(const s of schedule.segments.slice(1))for(const t of [s.start,s.start+s.fade])
    points.add(Math.max(0,Math.min(schedule.duration,t)).toFixed(8));
  return [...points].map(Number).filter(Number.isFinite).sort((a,b)=>a-b).filter((t,i,all)=>i===0||t-all[i-1]>1e-8);
}
/** Explicit A/B; derived Burst clips are diagnostic substitutions only, not S5 runtime assets. */
export function auditS6bG7(T, model, sourceLibrary, {fpsList=[30,60],margin=.10}={}) {
  if(!fpsList.length||fpsList.some(fps=>![30,60].includes(fps))||!(margin>=0&&margin<=.3))throw Error('Unsupported G7 cadence');
  const plan=buildR61Plan(sourceLibrary),bones=modelBones(model),rest=capture(T,model,bones);
  const variants={};
  const identities=R61_SOURCE_IDS.map(id=>plan.clips[id]);
  const sourceFingerprint=JSON.stringify(identities.map(clip=>clip.toJSON()));
  const segments=plan.schedule.segments;
  if(segments.length!==7||segments.some((s,i)=>s.id!==R61_SOURCE_IDS[i]))throw Error('S5 source sequence changed');
  try {
    for(const variant of ['ORIGINAL','REBASED','ROOT_BODY_OWNED']) {
      const candidate=variant==='ORIGINAL'?plan.clips[BURST]:sourceLibrary.find(c=>c?.name==='SK_BURST_02_'+variant);
      if(!candidate){variants[variant]={status:'DIAGNOSTIC_VARIANT_ABSENT'};continue;}
      if(candidate.duration!==plan.clips[BURST].duration)throw Error('A/B duration mismatch: '+variant);
      const clips={...plan.clips,[BURST]:candidate};
      const driven=new Set(Object.values(clips).flatMap(c=>c.tracks.map(tr=>tr.name.split('.')[0])));
      const joins=[];
      for(let i=0;i<segments.length-1;i++){
        const A=segments[i],B=segments[i+1],atStart=B.start,atEnd=B.start+B.fade;
        const sample=t=>compare(T,
          singlePose(T,model,bones,rest,clips[A.id],clipTimeAt(plan.schedule,i,t)),
          singlePose(T,model,bones,rest,clips[B.id],clipTimeAt(plan.schedule,i+1,t)),driven);
        joins.push({join:i+1,from:A.id,to:B.id,start:+atStart.toFixed(6),fade:B.fade,
          sourceGapAtBlendStart:sample(atStart),sourceGapAtBlendEnd:sample(atEnd),
          soleContact:'NOT_MEASURED_WITH_SKINNED_VERTICES',sourceFrame:'UNKNOWN'});
      }
      restore(model,bones,rest);
      const seq=createComboSequencer(T,model,clips,plan.schedule),cadences={};
      try {
        for(const fps of fpsList){
          const times=timesFor(plan.schedule,fps),rows=joins.map(()=>({maxLocalStepDeg:0,maxWorldStep:0,maxFootStep:0,atLocal:null,atWorld:null}));
          let previous=null;
          for(const t of times){
            seq.seek(t); const current=capture(T,model,bones);
            if(previous) {
              const d=compare(T,previous.snap,current,driven),world=Object.values(d.world).reduce((v,p)=>Math.max(v,p.step),0),
                foot=Math.max(d.world.Bip001LFoot.step,d.world.Bip001RFoot.step);
              for(let j=0;j<joins.length;j++){
                const B=segments[j+1]; if(t<B.start-margin||previous.t>B.start+B.fade+margin)continue;
                const row=rows[j];
                if(d.maxLocalDeg>row.maxLocalStepDeg){row.maxLocalStepDeg=d.maxLocalDeg;row.atLocal=t;}
                if(world>row.maxWorldStep){row.maxWorldStep=world;row.atWorld=t;}
                if(foot>row.maxFootStep)row.maxFootStep=foot;
              }
            }
            previous={t,snap:current};
          }
          cadences[fps]=rows.map(row=>({maxLocalStepDeg:+row.maxLocalStepDeg.toFixed(4),maxWorldStep:+row.maxWorldStep.toFixed(6),
            maxFootStep:+row.maxFootStep.toFixed(6),atLocal:row.atLocal,atWorld:row.atWorld}));
        }
      } finally {seq.dispose();restore(model,bones,rest);}
      variants[variant]={status:S6B_STATUS,joins,cadences};
    }
  } finally {restore(model,bones,rest);}
  if(JSON.stringify(identities.map(clip=>clip.toJSON()))!==sourceFingerprint)throw Error('Source clips mutated by G7 audit');
  return {schema:'shorekeeper.s6b.s5-g7-seams/1',status:S6B_STATUS,library:'S5/R6.2.3 (seven original IDs)',
    schedule:'buildR61Plan: exact runtime plan, not buildInspectableCombo',
    modelUnits:'MODEL_NATIVE; calibration required before claiming metres',
    sourceFrame:'UNKNOWN_PSA_NOT_MAPPED',canonical:'NO_GO',visual:'PENDING_AUTHENTICATED_30_60HZ_AB',
    transitions:segments.slice(1).map((s,i)=>({join:i+1,from:segments[i].id,to:s.id,fade:s.fade,start:s.start})),
    variants};
}
