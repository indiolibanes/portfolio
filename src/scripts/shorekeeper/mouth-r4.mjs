import {createMouthR3} from './mouth-r3.mjs';
import {findMouthContour,findLinerIslands,buildStationCurve,WELD_MORPHS,linerDelta} from './mouth-ribbon-weld.mjs';
/** Shape-preserving C1 interpolation: no overshoot, and no forced stop at every station. */
export function monotoneStation(curve,x){
 if(curve.length<2)throw Error('Two stations required');
 let i=0;while(i<curve.length-2&&x>curve[i+1].x)i++;
 const a=curve[i],b=curve[i+1],h=b.x-a.x,t=Math.max(0,Math.min(1,(x-a.x)/h));
 const tangent=(j,k)=>{if(j===0)return (curve[1].d[k]-curve[0].d[k])/(curve[1].x-curve[0].x);if(j===curve.length-1)return (curve[j].d[k]-curve[j-1].d[k])/(curve[j].x-curve[j-1].x);const h0=curve[j].x-curve[j-1].x,h1=curve[j+1].x-curve[j].x,d0=(curve[j].d[k]-curve[j-1].d[k])/h0,d1=(curve[j+1].d[k]-curve[j].d[k])/h1;if(d0*d1<=0)return 0;const w0=2*h1+h0,w1=h1+2*h0;return (w0+w1)/(w0/d0+w1/d1);};
 return a.d.map((v,k)=>(2*t**3-3*t*t+1)*v+(t**3-2*t*t+t)*h*tangent(i,k)+(-2*t**3+3*t*t)*b.d[k]+(t**3-t*t)*h*tangent(i+1,k));
}
/** R4 stays opt-in; uses the same reversible owner and never changes canonical material or blink. */
export function createMouthR4(model){
 const face=model.getObjectByName('Shorekeeper_Face'),source=face.geometry,owner=createMouthR3(model,{thickness:.45,lift:.48,smileGain:.85,addGain:.65,stationInterpolator:monotoneStation}),g=face.geometry,P=source.attributes.position,ids=findMouthContour(source),span=Math.max(...ids.map(i=>Math.abs(P.getX(i)))),stations=[];
 for(let s=0;s<13;s++){const x=-span+2*span*s/12,near=ids.filter(i=>Math.abs(P.getX(i)-x)<span/12);if(!near.length)near.push(ids.reduce((a,b)=>Math.abs(P.getX(a)-x)<Math.abs(P.getX(b)-x)?a:b));const ys=near.map(i=>P.getY(i)),zs=near.map(i=>P.getZ(i));stations.push({x,d:[0,(Math.min(...ys)+Math.max(...ys))/2,(Math.min(...zs)+Math.max(...zs))/2]});}
 // Neutral cross-section narrows in BOTH depth and height, avoiding a forked rim in three-quarter view.
 for(const i of ids){const d=monotoneStation(stations,P.getX(i)),u=Math.max(0,Math.min(1,(Math.abs(P.getX(i))/span-.7)/.3)),thickness=.45*(1-.75*u*u*(3-2*u));g.attributes.position.setY(i,d[1]+(P.getY(i)-d[1])*thickness);g.attributes.position.setZ(i,d[2]+(P.getZ(i)-d[2])*thickness);}
 const linerIds=findLinerIslands(source,ids).flat(),x=Float64Array.from(ids,i=>P.getX(i)),zs=linerIds.map(i=>P.getZ(i)),zFront=Math.max(...zs),zBack=Math.min(...zs);let corrected=0;
 for(const name of WELD_MORPHS){const index=face.morphTargetDictionary[name];if(index===undefined)continue;const attr=g.morphAttributes.position[index],delta=Float64Array.from(ids.flatMap(i=>[attr.getX(i),attr.getY(i),attr.getZ(i)])),field=buildStationCurve({x,delta,anchor:3e-3,center:.75e-3,tolerance:.7e-3});if(field.reason!=='ok')continue;
  for(const i of linerIds){const d=linerDelta({curve:field,side:field.side,ax:P.getX(i),z:P.getZ(i),zFront,zBack});if(d.some(v=>Math.abs(v)>1e-8)){attr.setXYZ(i,...d);corrected++;}}attr.needsUpdate=true;
 }
 g.attributes.position.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();owner.linerVertices=linerIds.length;owner.report.push({revision:'R4',linerCorrections:corrected,neutralDepthThickness:.45,cornerTaper:true});return owner;
}
