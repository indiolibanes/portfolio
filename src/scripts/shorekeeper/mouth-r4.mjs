import {createMouthR3} from './mouth-r3.mjs';
/** Shape-preserving C1 interpolation: no overshoot, and no forced stop at every station. */
export function monotoneStation(curve,x){
 if(curve.length<2)throw Error('Two stations required');
 let i=0;while(i<curve.length-2&&x>curve[i+1].x)i++;
 const a=curve[i],b=curve[i+1],h=b.x-a.x,t=Math.max(0,Math.min(1,(x-a.x)/h));
 const tangent=(j,k)=>{if(j===0)return (curve[1].d[k]-curve[0].d[k])/(curve[1].x-curve[0].x);if(j===curve.length-1)return (curve[j].d[k]-curve[j-1].d[k])/(curve[j].x-curve[j-1].x);const h0=curve[j].x-curve[j-1].x,h1=curve[j+1].x-curve[j].x,d0=(curve[j].d[k]-curve[j-1].d[k])/h0,d1=(curve[j+1].d[k]-curve[j].d[k])/h1;if(d0*d1<=0)return 0;const w0=2*h1+h0,w1=h1+2*h0;return (w0+w1)/(w0/d0+w1/d1);};
 return a.d.map((v,k)=>(2*t**3-3*t*t+1)*v+(t**3-2*t*t+t)*h*tangent(i,k)+(-2*t**3+3*t*t)*b.d[k]+(t**3-t*t)*h*tangent(i+1,k));
}
/** R4 stays opt-in; uses the same reversible owner and never changes canonical material or blink. */
export function createMouthR4(model){return createMouthR3(model,{thickness:.45,lift:.48,smileGain:.85,addGain:.65,stationInterpolator:monotoneStation});}
