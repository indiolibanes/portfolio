/** Sampled 3D surface intersections. A vertex behind a sleeve in a front projection may be
 * correctly occluded; actual skin/cloth surface crossings are tested here in world space.
 * No cloth simulation, no continuous collision guarantee. Preparation only, never per rAF. */
export function createSleeveIntersectionAudit({THREE,meshes,side='L',scale}){
 const moving=[],sleeves=[],cell=scale*.45,canon=n=>(n??'').replace(/[^a-z0-9]/gi,'').toLowerCase();
 for(const mesh of meshes){
  const body=/up xin/i.test(mesh.material?.name??''),cloth=/cloth|down/i.test(mesh.material?.name??'');if(!body&&!cloth)continue;
  const g=mesh.geometry,j=g.getAttribute('skinIndex'),w=g.getAttribute('skinWeight');if(!j||!w)continue;
  const weights=[];
  for(let i=0;i<j.count;i++){
   let lower=0,upper=0;for(let k=0;k<4;k++){
    const n=canon(mesh.skeleton.bones[j.getComponent(i,k)]?.name),weight=w.getComponent(i,k);
    if(n.includes('bip001upperarm'+side.toLowerCase()))upper+=weight;
    if(new RegExp('bip001(?:forearm|foretwist|hand|finger)[0-9]*'+side.toLowerCase()).test(n))lower+=weight;
   }weights.push({lower,upper});
  }
  const index=g.index,idx=i=>index?index.getX(i):i;
  for(let i=0;i+2<(index?.count??j.count);i+=3){const ids=[idx(i),idx(i+1),idx(i+2)];
   if(body&&ids.every(k=>weights[k].lower>.65))moving.push({mesh,ids});
   if(cloth&&ids.every(k=>weights[k].upper>.65))sleeves.push({mesh,ids});
  }
 }
 const ray=new THREE.Ray(),hit=new THREE.Vector3(),epsilon=scale*1e-5;
 const segment=(a,b,tri)=>{const length=a.distanceTo(b);if(length<=epsilon)return false;ray.set(a,b.clone().sub(a).multiplyScalar(1/length));const result=ray.intersectTriangle(...tri,false,hit);if(!result)return false;const d=a.distanceTo(result);return d>epsilon&&d<length-epsilon;};
 const crossing=(a,b)=>{for(let k=0;k<3;k++)if(segment(a[k],a[(k+1)%3],b)||segment(b[k],b[(k+1)%3],a))return true;return false;};
 function check(){
  for(const mesh of meshes){mesh.updateWorldMatrix(true,false);mesh.skeleton.update();}
  const cache=new Map(),point=(m,i)=>{if(!cache.has(m))cache.set(m,new Map());const values=cache.get(m);if(!values.has(i))values.set(i,m.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(m.matrixWorld));return values.get(i);};
  const world=row=>row.ids.map(i=>point(row.mesh,i)),fixed=sleeves.map(world),grid=new Map();
  const bounds=t=>[0,1,2].map(axis=>{const a=t.map(v=>v.getComponent(axis));return [Math.floor(Math.min(...a)/cell),Math.floor(Math.max(...a)/cell)];});
  const cells=(t,fn)=>{const [[x0,x1],[y0,y1],[z0,z1]]=bounds(t);for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)fn(x+','+y+','+z);};
  fixed.forEach((t,i)=>cells(t,key=>{if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);}));
  let intersections=0,tested=0;const contacts=[];
  for(const row of moving){const t=world(row),candidates=new Set();cells(t,key=>{for(const i of grid.get(key)??[])candidates.add(i);});for(const i of candidates){tested++;if(crossing(t,fixed[i])){intersections++;if(contacts.length<6)contacts.push(hit.toArray());}}}
  return {covered:moving.length>0&&sleeves.length>0,intersections,tested,contacts,method:'SAMPLED_TRIANGLE_INTERSECTIONS_3D'};
 }
 return {check,diagnostics:()=>({movingTriangles:moving.length,sleeveTriangles:sleeves.length,method:'SAMPLED_TRIANGLE_INTERSECTIONS_3D'})};
}
