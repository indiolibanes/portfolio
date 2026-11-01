import {FACE_ACTING_NAMES,PASS_B_NAMES,PASS_B1_EXTRA_NAMES} from './hsin-face-channels.mjs';
export function snapshotFace(meshes) {
  return new Map(meshes.filter(m=>m.morphTargetInfluences).map(m=>[m,[...m.morphTargetInfluences]]));
}
export function restoreFace(snapshot) {
  for (const [mesh, values] of snapshot) values.forEach((v,i)=>{ mesh.morphTargetInfluences[i]=v; });
}

export function createFaceBinding(meshes, baseline, calibration, audit={limits:{}}) {
  const names=[...new Set([...FACE_ACTING_NAMES,...PASS_B_NAMES,...PASS_B1_EXTRA_NAMES])];
  const channels = new Set();
  for(const mesh of meshes) for(const name of names) if(mesh.morphTargetDictionary?.[name]!==undefined)channels.add(name);
  return {
    channels:[...channels],
    apply(state) {
      const gazeMagnitude=Math.hypot(...state.gaze);
      for(const [mesh,base] of baseline) for(const name of names) {
        const i=mesh.morphTargetDictionary?.[name];if(i===undefined)continue;
        const v=base[i];let value=v;
        if(name==='E_Close_R')value=v+(1-v)*state.closeR;
        else if(name==='E_Close_L')value=v+(1-v)*state.closeL;
        else if(name==='M_Smile_R')value=v+(1-v)*Math.min(state.smileR,(['b','b1'].includes(state.policy)&&!state.diagnostic&&!state.authored)?(audit.limits[name]??0):1);
        else if(name==='M_Smile_L')value=v+(1-v)*Math.min(state.smileL,(['b','b1'].includes(state.policy)&&!state.diagnostic&&!state.authored)?(audit.limits[name]??0):1);
        else if(audit.limits[name]>0) {
          // Full 0..1 only for an explicit B.1 lab test; automatic policy stays conservative.
          const ceiling=state.policy==='b1'&&(state.diagnostic||state.authored)?1:audit.limits[name];
          let overlay=Math.max(0,Math.min(ceiling,state.overlays?.[name]??0));
          if(/^E_(Smile|Squint)_/.test(name))overlay*=Math.pow(1-(name.endsWith('_R')?state.closeR:state.closeL),2);
          value=v+(1-v)*overlay;
        }
        else if(calibration.ready && calibration.directions[name]) {
          const d=calibration.directions[name], weight=Math.max(0,d.reduce((sum,x,j)=>sum+x*state.gaze[j],0));
          value=v*(1-gazeMagnitude)+(1-v)*weight;
        }
        // Exact neutral values remain exact, including nonstandard exported weights.
        mesh.morphTargetInfluences[i]=value===v ? v : Math.max(Math.min(v,0),Math.min(Math.max(v,1),value));
      }
    },
    restore() { restoreFace(baseline); },
  };
}
