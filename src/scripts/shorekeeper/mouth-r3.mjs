/** Reversible R3 geometry candidate. No canonical buffers/materials or blink channels are written. */
import {createMouthRibbonWeld, findMouthContour, buildStationCurve, WELD_MORPHS} from './mouth-ribbon-weld.mjs';
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const smooth = t => t*t*(3-2*t);
/** C1 interpolation with flat station tangents: no derivative step at the centre anchor. */
export function smoothStation(curve, x) {
 let i=0; while(i<curve.length-2 && x>curve[i+1].x)i++;
 const a=curve[i],b=curve[i+1],t=smooth(clamp((x-a.x)/Math.max(1e-9,b.x-a.x),0,1));
 return a.d.map((v,k)=>v+(b.d[k]-v)*t);
}
export function createMouthR3(model,{thickness=.28,lift=.48}={}) {
 if(!(thickness>=.15&&thickness<=1)||!(lift>=0&&lift<=.7))throw Error('Invalid mouth candidate bounds');
 const face=model.getObjectByName('Shorekeeper_Face');
 if(!face?.geometry?.morphTargetsRelative)throw Error('Relative canonical Face required');
 const source=face.geometry, ids=findMouthContour(source); if(!ids)throw Error('Contour not found');
 // R2 owns cloning/restoration; R3 replaces only the candidate contour field on that clone.
 const owner=createMouthRibbonWeld(model,{lift:0,liner:false}),g=face.geometry,P=source.attributes.position;
 const x=Float64Array.from(ids,i=>P.getX(i)), stations=[];
 // Anatomical cross sections: front/back x can differ. Fit the neutral centreline from 13 equal x bins.
 const span=Math.max(...x.map(Math.abs));
 for(let s=0;s<13;s++){
  const cx=-span+2*span*s/12, near=ids.filter(i=>Math.abs(P.getX(i)-cx)<span/12);
  const ys=near.map(i=>P.getY(i));
  stations.push({x:cx,d:[0,ys.length?(Math.min(...ys)+Math.max(...ys))/2:1.3445,0]});
 }
 for(const i of ids){const cy=smoothStation(stations,P.getX(i))[1];g.attributes.position.setY(i,cy+(P.getY(i)-cy)*thickness);}
 const report=[];
 for(const name of WELD_MORPHS){
  const mi=face.morphTargetDictionary[name];if(mi===undefined)continue;
  const a=source.morphAttributes.position[mi],target=g.morphAttributes.position[mi];
  const delta=Float64Array.from(ids.flatMap(i=>[a.getX(i),a.getY(i),a.getZ(i)]));
  const field=buildStationCurve({x,delta,anchor:3e-3,center:.75e-3,tolerance:.7e-3});
  if(field.reason!=='ok')continue;
  const gain=name.startsWith('M_Smile')?.65:name.startsWith('P_M_')?.45:.8;
  let changed=0;
  ids.forEach((i,k)=>{
   if(Math.sign(x[k])!==field.side)return;
   const d=smoothStation(field.curve,Math.abs(x[k]));
   // All partners use the same smooth displacement, including originally moved partners.
   const dy=clamp(d[1]*gain,-1.8e-3,1.8e-3);
   target.setXYZ(i,d[0]*gain,dy,d[2]*gain+Math.max(0,dy)*lift);changed++;
  });
  target.needsUpdate=true;report.push({name,changed,gain});
 }
 g.attributes.position.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
 return {get active(){return owner.active;},report,thickness,lift,linerVertices:0,status:'B_VISUAL_QA_PENDING',restore:()=>owner.restore(),dispose:()=>owner.dispose()};
}
