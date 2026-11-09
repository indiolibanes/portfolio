/** Observation only. Animation-only GLBs have Object3D nodes, not Three Bones. */
export function createSourceRigLines(T,model){
 const pairs=[];model.traverse(o=>{if(o.name&&o.parent?.name)pairs.push([o.parent,o]);});
 if(!pairs.length)throw Error('Source rig has no observable parent-child segments');
 const positions=new T.Float32BufferAttribute(new Float32Array(pairs.length*6),3);positions.setUsage(T.DynamicDrawUsage);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',positions);const material=new T.LineBasicMaterial({color:0xc1dbea}),lines=new T.LineSegments(geometry,material),p=new T.Vector3();let disposed=false;
 return {lines,segments:pairs.length,update(){if(disposed)return;model.updateMatrixWorld(true);pairs.forEach(([a,b],i)=>{a.getWorldPosition(p);positions.setXYZ(i*2,p.x,p.y,p.z);b.getWorldPosition(p);positions.setXYZ(i*2+1,p.x,p.y,p.z);});positions.needsUpdate=true;geometry.computeBoundingSphere();},dispose(){if(disposed)return;disposed=true;lines.removeFromParent();geometry.dispose();material.dispose();}};
}
