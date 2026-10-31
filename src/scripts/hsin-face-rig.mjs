import { PASS_B_NAMES } from './hsin-face-morph-audit.mjs';
/** Morph adapter: no URLs/assets, no changes to bones/materials. THREE is injected. */
export const PUPIL_NAMES = ['Up','Down','In','Out'].flatMap(axis => ['R','L'].map(side => `Pupil_${axis}_${side}`));
export const FACE_ACTING_NAMES = ['E_Close_R','E_Close_L','M_Smile_R','M_Smile_L',...PUPIL_NAMES];

export function snapshotFace(meshes) {
  return new Map(meshes.filter(m=>m.morphTargetInfluences).map(m=>[m,[...m.morphTargetInfluences]]));
}
export function restoreFace(snapshot) {
  for (const [mesh, values] of snapshot) values.forEach((v,i)=>{ mesh.morphTargetInfluences[i]=v; });
}

/** Measure signed, skinned displacement in head-local space. Names alone do not set gaze signs. */
export function calibratePupils(THREE, meshes, head) {
  const directions = {}, records = [];
  if (!head) return {ready:false, directions, records, reason:'Osso da cabeça ausente ou ambíguo.'};
  head.updateWorldMatrix(true,false);
  const inverse = head.matrixWorld.clone().invert();
  for (const name of PUPIL_NAMES) {
    const candidates=[];
    for (const mesh of meshes) {
      const index=mesh.morphTargetDictionary?.[name], attribute=mesh.geometry.morphAttributes.position?.[index];
      if (index===undefined || !attribute || !mesh.geometry.morphTargetsRelative) continue;
      // Use vertices with meaningful displacement. Normal-only/noise targets are excluded.
      let max=0;
      for(let i=0;i<attribute.count;i++) max=Math.max(max,Math.hypot(attribute.getX(i),attribute.getY(i),attribute.getZ(i)));
      if(max < 1e-6) continue;
      const indices=[];
      for(let i=0;i<attribute.count;i++) if(Math.hypot(attribute.getX(i),attribute.getY(i),attribute.getZ(i))>max*.1) indices.push(i);
      const saved=mesh.morphTargetInfluences[index], sum=new THREE.Vector3(), center=new THREE.Vector3(), base=new THREE.Vector3(), moved=new THREE.Vector3();
      mesh.updateWorldMatrix(true,false); mesh.skeleton?.update();
      let count=0;
      try {
        for(let k=0;k<indices.length;k+=Math.max(1,Math.ceil(indices.length/64))) {
          const i=indices[k];
          mesh.morphTargetInfluences[index]=0; mesh.getVertexPosition(i,base).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
          mesh.morphTargetInfluences[index]=1; mesh.getVertexPosition(i,moved).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
          center.add(base); sum.add(moved.sub(base)); count++;
        }
      } finally { mesh.morphTargetInfluences[index]=saved; }
      if(count && sum.length()>1e-7) candidates.push({mesh:mesh.name, displacement:sum.divideScalar(count),center:center.divideScalar(count),count});
    }
    candidates.sort((a,b)=>b.displacement.lengthSq()-a.displacement.lengthSq());
    const best=candidates[0];
    if(best) { directions[name]=best.displacement.clone().normalize().toArray(); records.push({name,mesh:best.mesh,samples:best.count,meanHeadLocalDelta:best.displacement.toArray(),center:best.center.toArray()}); }
  }
  let ready=PUPIL_NAMES.every(name=>directions[name]);
  if(ready) for(const side of ['R','L']) {
    const vector=n=>new THREE.Vector3(...directions[`Pupil_${n}_${side}`]);
    if(vector('Up').dot(vector('Down')) > -.75 || vector('In').dot(vector('Out')) > -.75 || Math.abs(vector('Up').dot(vector('In'))) > .45) ready=false;
  }
  const right=records.find(r=>r.name==='Pupil_In_R'), left=records.find(r=>r.name==='Pupil_In_L');
  const radius=right&&left ? new THREE.Vector3(...right.center).distanceTo(new THREE.Vector3(...left.center))*2.5 : 0;
  ready = ready && radius > 1e-5;
  return {ready,directions,records,radius,focusCenter:right&&left?new THREE.Vector3(...right.center).add(new THREE.Vector3(...left.center)).multiplyScalar(.5).toArray():null,reason:ready?'Direções medidas na geometria skinned. Validação visual pendente.':'Morphs de pupila ausentes, degenerados ou direções incompatíveis; olhar desativado.'};
}

/** Cursor ray -> camera-facing attention plane -> head-local offset, never screen-side aliases. */
export function cursorHeadOffset(THREE, ndc, camera, head, radius, localCenter=[0,0,0]) {
  if(!head || !(radius>0)) return [0,0,0];
  head.updateWorldMatrix(true,false);camera.updateMatrixWorld();
  const center=head.localToWorld(new THREE.Vector3(...localCenter)), normal=camera.getWorldDirection(new THREE.Vector3());
  const ray=new THREE.Raycaster(); ray.setFromCamera(ndc,camera);
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,center), hit=new THREE.Vector3();
  if(!ray.ray.intersectPlane(plane,hit))return [0,0,0];
  const inv=head.matrixWorld.clone().invert();
  return hit.applyMatrix4(inv).sub(center.clone().applyMatrix4(inv)).divideScalar(radius).clampLength(0,1).toArray();
}


export function measuredGazeAxes(THREE, calibration) {
  if(!calibration.ready)return undefined;
  const horizontal=new THREE.Vector3(...calibration.directions.Pupil_In_R)
    .sub(new THREE.Vector3(...calibration.directions.Pupil_In_L)).normalize();
  const vertical=new THREE.Vector3(...calibration.directions.Pupil_Up_R)
    .add(new THREE.Vector3(...calibration.directions.Pupil_Up_L));
  vertical.addScaledVector(horizontal,-vertical.dot(horizontal)).normalize();
  return {horizontal:horizontal.toArray(),vertical:vertical.toArray()};
}
export function projectGazeOffset(THREE, offset, calibration) {
  const axes=measuredGazeAxes(THREE,calibration);if(!axes)return [0,0,0];
  const horizontal=new THREE.Vector3(...axes.horizontal),vertical=new THREE.Vector3(...axes.vertical),desired=new THREE.Vector3(...offset);
  return horizontal.multiplyScalar(desired.dot(horizontal)).addScaledVector(vertical,desired.dot(vertical)).clampLength(0,1).toArray();
}

export function createFaceBinding(meshes, baseline, calibration, audit={limits:{}}) {
  const names=[...new Set([...FACE_ACTING_NAMES,...PASS_B_NAMES])];
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
        else if(name==='M_Smile_R')value=v+(1-v)*Math.min(state.smileR,state.policy==='b'?(audit.limits[name]??0):1);
        else if(name==='M_Smile_L')value=v+(1-v)*Math.min(state.smileL,state.policy==='b'?(audit.limits[name]??0):1);
        else if(audit.limits[name]>0) {
          let overlay=Math.max(0,Math.min(audit.limits[name],state.overlays?.[name]??0));
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
