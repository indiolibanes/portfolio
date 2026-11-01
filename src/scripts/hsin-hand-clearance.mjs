/** Vertex samples from the loaded skin, never model data bundled with the application. */
export function sampleHandSurface({THREE,meshes,side}){
 const points=[],suffix=side.toLowerCase();
 for(const mesh of meshes){
  if(!/up xin/i.test(mesh.material?.name??''))continue;
  const j=mesh.geometry.getAttribute('skinIndex'),w=mesh.geometry.getAttribute('skinWeight');if(!j||!w)continue;
  mesh.updateWorldMatrix(true,false);mesh.skeleton.update();
  for(let i=0;i<j.count;i++){
   let hand=0;for(let k=0;k<4;k++){
    const name=(mesh.skeleton.bones[j.getComponent(i,k)]?.name??'').replace(/[^a-z0-9]/gi,'').toLowerCase();
    if(new RegExp('bip001(?:hand|finger[0-9]*)'+suffix+'(?:[0-9]*)$').test(name))hand+=w.getComponent(i,k);
   }
   if(hand>.65)points.push(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).toArray());
  }
 }
 return points;
}
/** Small spatial grid for a fixed companion hand. Point-to-point distance, not triangle intersection. */
export function createHandClearance({points,scale}){
 const cell=scale*.5,grid=new Map();
 for(const p of points??[]){const key=p.map(x=>Math.floor(x/cell)).join(',');if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p);}
 return {check(moving){
  let min=Infinity;
  for(const p of moving){const c=p.map(x=>Math.floor(x/cell));for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){
   for(const b of grid.get([c[0]+x,c[1]+y,c[2]+z].join(','))??[])min=Math.min(min,Math.hypot(...p.map((v,i)=>v-b[i])));
  }}
  return {covered:!!points?.length&&!!moving.length,tooClose:min<scale*.12,minDistance:Number.isFinite(min)?min:null};
 }};
}
