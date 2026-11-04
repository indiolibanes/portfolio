import {createMouthR4,monotoneStation} from './mouth-r4.mjs';
import {findMouthContour,buildStationCurve,WELD_MORPHS} from './mouth-ribbon-weld.mjs';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Reversible local closure of the lip seam. R4 remains an independent comparison/rollback. */
export function createMouthR5(model){
 const face=model.getObjectByName('Shorekeeper_Face'),source=face.geometry,owner=createMouthR4(model),g=face.geometry,P=source.attributes.position,ids=findMouthContour(source),contour=new Set(ids),span=Math.max(...ids.map(i=>Math.abs(P.getX(i)))),stations=[];
 for(let s=0;s<13;s++){const x=-span+2*span*s/12,near=ids.filter(i=>Math.abs(P.getX(i)-x)<span/12);if(!near.length)continue;stations.push({x,d:[0,near.reduce((n,i)=>n+g.attributes.position.getY(i),0)/near.length,0]});}
 const rim=[];
 for(let i=0;i<P.count;i++){if(contour.has(i))continue;const x=P.getX(i),cy=monotoneStation(stations,Math.max(-span,Math.min(span,x)))[1],dy=P.getY(i)-cy;
  const w=(1-smooth((Math.abs(x)-.007)/.006))*(1-smooth((Math.abs(dy)-.0005)/.003))*smooth((P.getZ(i)-.021)/.008);
  if(w<=0)continue;g.attributes.position.setY(i,P.getY(i)-dy*.72*w);rim.push({i,w});
 }
 // The skin edge and cavity rim now follow the same field as the stroke. The old correction
 // covered the disconnected liner islands only, leaving the canonical skin aperture behind.
 const x=Float64Array.from(ids,i=>P.getX(i));let corrections=0;
 for(const name of WELD_MORPHS){const mi=face.morphTargetDictionary[name];if(mi===undefined)continue;const a=g.morphAttributes.position[mi],field=buildStationCurve({x,delta:Float64Array.from(ids.flatMap(i=>[a.getX(i),a.getY(i),a.getZ(i)])),anchor:.003,center:.00075,tolerance:.0007});if(field.reason!=='ok')continue;
  for(const {i,w} of rim){const ax=P.getX(i);if(Math.sign(ax)!==field.side||Math.abs(ax)<=field.x0)continue;const edge=1-smooth((Math.abs(ax)-field.tip)/.004),k=w*edge,d=monotoneStation(field.curve,Math.min(Math.abs(ax),field.tip));a.setXYZ(i,a.getX(i)*(1-k)+d[0]*k,a.getY(i)*(1-k)+d[1]*k,a.getZ(i)*(1-k)+d[2]*k);corrections++;}a.needsUpdate=true;
 }
 g.attributes.position.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();owner.report.push({revision:'R5',localRimVertices:rim.length,neutralPinch:.72,rimMorphCorrections:corrections,maxRegionMetres:[.013,.0035,.021],visualQA:'PENDING'});return owner;
}
