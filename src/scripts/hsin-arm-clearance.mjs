/** Project actual deformed torso/garment triangles into anatomical space.
 * A front-envelope guard, not cloth physics or a complete collision solver.
 * Built only while baking a candidate, never in the frame loop. */
export function createArmClearanceAudit({THREE,meshes,side,origin,outward,up,forward,scale,includeHead=false,includeMovingGarment=false}) {
 const canon=n=>n.replace(/[^a-z0-9]/gi,'').toLowerCase();
 const components=(mesh,index)=>{
  const j=mesh.geometry.getAttribute('skinIndex'),w=mesh.geometry.getAttribute('skinWeight');
  let trunk=0,upper=0,lower=0;
  for(let k=0;k<4;k++){
   const name=canon(mesh.skeleton.bones[j.getComponent(index,k)]?.name??''),weight=w.getComponent(index,k);
   if(/spine|pelvis|neck/.test(name))trunk+=weight;
   if(name.includes('bip001upperarm'+side.toLowerCase()))upper+=weight;
   if(new RegExp('bip001(?:forearm|foretwist|hand|finger)[0-9]*'+side.toLowerCase()).test(name))lower+=weight;
  }
  return {trunk,upper,lower};
 };
 const surfaces=[],moving=[];
 for(const mesh of meshes){
  const g=mesh.geometry;if(!g.getAttribute('skinIndex')||!g.getAttribute('skinWeight'))continue;
  const body=/up xin/i.test(mesh.material?.name??''),garment=/cloth|tail|down/i.test(mesh.material?.name??'');
  const hair=includeHead&&/hair|bangs/i.test(mesh.material?.name??''),face=includeHead&&/face xin/i.test(mesh.material?.name??'');
  if(!body&&!garment&&!hair&&!face)continue;
  const types=Array.from({length:g.getAttribute('position').count},(_,i)=>components(mesh,i));
  if(body||includeMovingGarment&&garment)for(let i=0;i<types.length;i++)if(types[i].lower>.65)moving.push({mesh,index:i});
  const index=g.getIndex(),length=index?.count??types.length;
  const vertex=i=>index?index.getX(i):i;
  for(let i=0;i+2<length;i+=3){const ids=[vertex(i),vertex(i+1),vertex(i+2)];
   const torso=body&&ids.every(j=>types[j].trunk>.5);
   const sleeve=garment&&ids.every(j=>types[j].upper>.65);
   if(torso||sleeve||face||hair)surfaces.push({mesh,ids,kind:torso?'torso':sleeve?'sleeve':face?'head':'hair'});
  }
 }
 const local=(mesh,index)=>{
  const p=mesh.getVertexPosition(index,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).sub(origin);
  return [p.dot(outward),p.dot(up),p.dot(forward)];
 };
 const cell=scale*.18;
 function check(){
  for(const mesh of meshes){mesh.updateWorldMatrix(true,false);mesh.skeleton.update();}
  const kinds=includeHead?['torso','sleeve','head','hair']:['torso','sleeve'];
  const grids=Object.fromEntries(kinds.map(k=>[k,new Map()])),cache=new Map();
  const point=(mesh,i)=>{let values=cache.get(mesh);if(!values)cache.set(mesh,values=new Map());if(!values.has(i))values.set(i,local(mesh,i));return values.get(i);};
  for(const {mesh,ids,kind}of surfaces){
   const [a,b,c]=ids.map(i=>point(mesh,i));
   const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-10)continue;
   const x0=Math.floor(Math.min(a[0],b[0],c[0])/cell),x1=Math.ceil(Math.max(a[0],b[0],c[0])/cell);
   const y0=Math.floor(Math.min(a[1],b[1],c[1])/cell),y1=Math.ceil(Math.max(a[1],b[1],c[1])/cell);
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    const px=(x+.5)*cell,py=(y+.5)*cell;
    const u=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/den;
    const v=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/den;
    if(u<0||v<0||u+v>1)continue;const depth=u*a[2]+v*b[2]+(1-u-v)*c[2],key=x+','+y;
    grids[kind].set(key,Math.max(grids[kind].get(key)??-Infinity,depth));
   }
  }
  const report=Object.fromEntries(kinds.map(k=>[k,{tested:0,violations:0,minClearance:null}]));
  for(const {mesh,index}of moving){const p=point(mesh,index),key=Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell);
   for(const kind of kinds){
    const depth=grids[kind].get(key);if(depth===undefined)continue;
    const gap=p[2]-depth,row=report[kind];row.tested++;row.minClearance=Math.min(row.minClearance??Infinity,gap);
    if(gap<scale*(kind==='torso'?.12:.025))row.violations++;
   }
  }
  return report;
 }
 return {check,diagnostics:()=>({movingVertices:moving.length,triangles:surfaces.length,cellSize:cell,method:'FRONT_ENVELOPE_SAMPLED',visual:'PENDING'})};
}
