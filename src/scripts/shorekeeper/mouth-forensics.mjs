/** Read-only geometry inventory. Does not write morphs, bones, material state or mixer tracks. */
export function connectedComponents(geometry){
 const count=geometry.attributes.position.count,parent=Int32Array.from({length:count},(_,i)=>i),used=new Uint8Array(count),index=geometry.index;
 const root=n=>{while(parent[n]!==n){parent[n]=parent[parent[n]];n=parent[n];}return n;};
 for(let i=0;i<(index?.count??count);i+=3){const a=index?index.getX(i):i;for(let j=0;j<3;j++){const b=index?index.getX(i+j):i+j;used[b]=1;parent[root(b)]=root(a);}}
 const groups=new Map();for(let i=0;i<count;i++){if(!used[i])continue;const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(i);}
 return [...groups.values()].sort((a,b)=>b.length-a.length);
}
function bounds(attr,ids){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const i of ids)for(let k=0;k<Math.min(3,attr.itemSize);k++){const v=attr.getComponent(i,k);min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);}return {min:min.slice(0,attr.itemSize),max:max.slice(0,attr.itemSize)};}
function deltaStats(geometry,index){
 const base=geometry.attributes.position,attr=geometry.morphAttributes.position[index],affected=[];let total=0,max=0;const relative=geometry.morphTargetsRelative;
 for(let i=0;i<base.count;i++){const x=attr.getX(i)-(relative?0:base.getX(i)),y=attr.getY(i)-(relative?0:base.getY(i)),z=attr.getZ(i)-(relative?0:base.getZ(i)),d=Math.hypot(x,y,z);if(!Number.isFinite(d))throw Error('Nonfinite morph position');if(d>1e-8)affected.push(i);total+=d;max=Math.max(max,d);}
 const normal=geometry.morphAttributes.normal?.[index];return {affectedVertices:affected.length,affectedFraction:affected.length/base.count,meanAll:total/base.count,meanAffected:affected.length?total/affected.length:0,max,affectedRegion:affected.length?bounds(base,affected):null,normalTarget:!!normal};
}
export function facialGeometryInventory(model){
 const meshes=[];let bones=0;const unique=new Set();model.traverse(m=>{if(m.isBone)bones++;if(!m.isMesh)return;
 const g=m.geometry,components=connectedComponents(g),morphs=Object.entries(m.morphTargetDictionary??{}).map(([name,index])=>{unique.add(name);return {name,index,influence:m.morphTargetInfluences[index],...deltaStats(g,index)};});
 meshes.push({mesh:m.name,vertices:g.attributes.position.count,triangles:(g.index?.count??g.attributes.position.count)/3,morphTargetsRelative:g.morphTargetsRelative,visible:m.visible,renderOrder:m.renderOrder,morphs,components:components.map((ids,id)=>({id,vertices:ids.length,bounds:bounds(g.attributes.position,ids),uvBounds:g.attributes.uv?bounds(g.attributes.uv,ids):null})),materials:(Array.isArray(m.material)?m.material:[m.material]).map(a=>({name:a.name,type:a.type,side:a.side,transparent:a.transparent,alphaTest:a.alphaTest,depthWrite:a.depthWrite,depthTest:a.depthTest,opacity:a.opacity,map:a.map?.name??null,alphaMap:a.alphaMap?.name??null}))});
 });return {status:'B_FACIAL_CAPABILITY_PARTIAL',visualQA:'B_VISUAL_QA_PENDING',bones,uniqueMorphNames:unique.size,morphInstances:meshes.reduce((n,m)=>n+m.morphs.length,0),meshes};
}
/** Temporary index/visibility override only. Canonical buffers are never edited. */
export function createMouthIsolation(T,model){
 const face=model.getObjectByName('Shorekeeper_Face');if(!face?.isMesh)throw Error('Canonical Face mesh missing');
 const originalGeometry=face.geometry,originalMaterial=face.material,visibility=[];model.traverse(m=>{if(m.isMesh)visibility.push([m,m.visible]);});
 const components=connectedComponents(originalGeometry),uv=originalGeometry.attributes.uv;
 // This atlas region was verified against the canonical Face texture; it is NOT an alpha guess.
 const contour=components.findIndex(ids=>{const b=bounds(uv,ids);return ids.length===52&&b.min[1]>.89&&b.max[1]<.93;});
 let temporary=null,debug=null,mode='all',disposed=false;
 function restore(){if(temporary){face.geometry=originalGeometry;temporary.dispose();temporary=null;}face.material=originalMaterial;if(debug){debug.dispose();debug=null;}for(const[m,v]of visibility)m.visible=v;mode='all';}
 return {contour,components:components.map((ids,id)=>({id,vertices:ids.length,bounds:bounds(originalGeometry.attributes.position,ids),uvBounds:bounds(uv,ids)})),
  select(value,{flat=false}={}){if(disposed)throw Error('Isolation disposed');restore();if(value==='all')return;
   const ids=value==='contour'?new Set(components[contour]??[]):value==='without-contour'?new Set(components[contour]??[]):value.startsWith('component:')?new Set(components[Number(value.split(':')[1])]??[]):null;
   if(!ids?.size)throw Error('Isolation component missing');const index=originalGeometry.index,keep=[];
   for(let i=0;i<(index?.count??originalGeometry.attributes.position.count);i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2,inside=ids.has(a)&&ids.has(b)&&ids.has(c);if(value==='without-contour'?!inside:inside)keep.push(a,b,c);}
   temporary=originalGeometry.clone();temporary.setIndex(keep);face.geometry=temporary;for(const[m]of visibility)m.visible=m===face;
   if(flat){debug=new T.MeshNormalMaterial({side:T.DoubleSide});face.material=debug;}mode=value;
  },restore,get mode(){return mode;},dispose(){if(disposed)return;restore();disposed=true;}
 };
}
