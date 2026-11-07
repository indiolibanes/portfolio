/** Pose handoff between exclusive mixer owners. Never edits source tracks. */
export function captureBodyPose(root){
 const pose=[];root.traverse(o=>{if(o.isBone)pose.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});});
 return ()=>{for(const {o,p,q,s} of pose){o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);}root.updateMatrixWorld(true);};
}
export function preserveBodyPose(root,release){const restore=captureBodyPose(root);try{return release();}finally{restore();}}
