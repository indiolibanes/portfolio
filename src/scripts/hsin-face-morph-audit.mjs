/** Geometry-only candidate audit. Runtime reports stay in the author's browser. */
export const PASS_B_NAMES = ['B_Cheerful_R','B_Cheerful_L','B_Up_Add_R','B_Up_Add_L',
  'E_Smile_R','E_Smile_L','E_Squint_R','E_Squint_L','M_Smile_R','M_Smile_L','P_Nose_Up','P_Nose_Down'];
export const PASS_B1_EXTRA_NAMES = ['M_meow_R','M_meow_L','M_Squint_R','M_Squint_L'];
export function auditFacialMorphs(THREE,meshes,head,calibration,{includeB1=false}={}){
  const requested=includeB1?[...PASS_B_NAMES,...PASS_B1_EXTRA_NAMES]:PASS_B_NAMES;
  const rows=[], masks=new Map(), eyeDistance=(calibration.radius??0)/2.5;
  if(!head)return {rows:requested.map(name=>({name,eligible:false,candidateCap:0,reason:'Cabeça ausente ou ambígua.'})),limits:{}};
  head.updateWorldMatrix(true,false);const inverse=head.matrixWorld.clone().invert();
  for(const name of [...requested,'E_Close_R','E_Close_L']){
    let affected=0,samples=0,maxDisplacement=0;const parts=[],mask=new Set(),sum=new THREE.Vector3(),center=new THREE.Vector3(),box=new THREE.Box3();
    for(let part=0;part<meshes.length;part++){
      const mesh=meshes[part],i=mesh.morphTargetDictionary?.[name],attribute=mesh.geometry.morphAttributes.position?.[i];
      if(i===undefined||!attribute||!mesh.geometry.morphTargetsRelative)continue;
      let peak=0,peakIndex=0;for(let v=0;v<attribute.count;v++){const d=Math.hypot(attribute.getX(v),attribute.getY(v),attribute.getZ(v));if(d>peak){peak=d;peakIndex=v;}}
      if(peak<1e-6)continue;
      const ids=[];for(let v=0;v<attribute.count;v++)if(Math.hypot(attribute.getX(v),attribute.getY(v),attribute.getZ(v))>Math.max(1e-6,peak*.05)){ids.push(v);mask.add(`${part}:${v}`);}
      if(!ids.length)continue;affected+=ids.length;parts.push(mesh.name);
      const selected=new Set([peakIndex]);for(let k=0;k<ids.length;k+=Math.max(1,Math.ceil(ids.length/96)))selected.add(ids[k]);
      const original=mesh.morphTargetInfluences[i];mesh.updateWorldMatrix(true,false);mesh.skeleton?.update();
      try{for(const v of selected){
        const base=new THREE.Vector3(),moved=new THREE.Vector3();
        mesh.morphTargetInfluences[i]=0;mesh.getVertexPosition(v,base).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
        mesh.morphTargetInfluences[i]=1;mesh.getVertexPosition(v,moved).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
        box.expandByPoint(base);center.add(base);const delta=moved.sub(base);sum.add(delta);maxDisplacement=Math.max(maxDisplacement,delta.length());samples++;
      }}finally{mesh.morphTargetInfluences[i]=original;}
    }
    masks.set(name,mask);
    if(!requested.includes(name))continue;
    const eligible=samples>0&&Number.isFinite(maxDisplacement)&&maxDisplacement>1e-7&&eyeDistance>1e-5;
    // Conservative initial weight caps scaled by measured displacement/inter-eye
    // separation. These are lab candidates, never a visual or anatomical approval.
    const maxWeight=name.startsWith('P_Nose')?.04:name.startsWith('E_')?.08:.12;
    const budget=eyeDistance*(name.startsWith('P_Nose')?.01:.02);
    const candidateCap=eligible?Math.min(maxWeight,budget/maxDisplacement):0;
    rows.push({name,eligible,affectedVertices:affected,samples,parts,
      meanHeadLocalDelta:samples?sum.divideScalar(samples).toArray():null,
      center:samples?center.divideScalar(samples).toArray():null,
      affectedBounds:samples?{min:box.min.toArray(),max:box.max.toArray()}:null,
      maxSampledDisplacement:maxDisplacement,interEyeDistance:eyeDistance,candidateCap,
      presentation:name.startsWith('P_Nose')?'LAB_ONLY_VISUAL_PENDING':'CANDIDATE_VISUAL_PENDING',
      diagnosticValidRange:[0,1],automaticCap: candidateCap,
      diagnosticBeyondAutoCap:eligible&&candidateCap<1,
      automaticNoseEnabled:false,
      reason:eligible?'Deslocamento medido; uso expressivo precisa de QA visual.':'Ausente, degenerado ou escala facial indisponível.'});
  }
  const up=calibration.ready?new THREE.Vector3(...calibration.directions.Pupil_Up_R).add(new THREE.Vector3(...calibration.directions.Pupil_Up_L)).normalize():null;
  for(const row of rows){
    if(up&&row.center&&calibration.focusCenter){
      row.heightFromEyeCenter=new THREE.Vector3(...row.center).sub(new THREE.Vector3(...calibration.focusCenter)).dot(up);
      row.meanDeltaAlongMeasuredUp=new THREE.Vector3(...row.meanHeadLocalDelta).dot(up);
    }
    const mask=masks.get(row.name);const overlap=other=>{let n=0;for(const id of mask)if(masks.get(other)?.has(id))n++;return mask.size?n/mask.size:0;};
    row.overlapCloseR=overlap('E_Close_R');row.overlapCloseL=overlap('E_Close_L');
    row.overlaps=rows.filter(other=>other.name!==row.name).map(other=>({name:other.name,fraction:overlap(other.name)})).filter(v=>v.fraction>.01).sort((a,b)=>b.fraction-a.fraction).slice(0,4);
  }
  return {rows,limits:Object.fromEntries(rows.filter(r=>r.eligible).map(r=>[r.name,r.candidateCap])),units:'head-local model units; fractions are affected-vertex overlap, not artistic conflict scores'};
}
