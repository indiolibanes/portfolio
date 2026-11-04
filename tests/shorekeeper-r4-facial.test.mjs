import test from 'node:test';import assert from 'node:assert/strict';
import {monotoneStation} from '../src/scripts/shorekeeper/mouth-r4.mjs';
test('R4 interpolation remains bounded and C1 without flattening a rising middle station',()=>{
 const c=[{x:0,d:[0,0,0]},{x:1,d:[0,1,0]},{x:3,d:[0,2,0]},{x:4,d:[0,2.2,0]}];let previous=-1;
 for(let i=0;i<=400;i++){const y=monotoneStation(c,i/100)[1];assert.ok(y>=previous-1e-12&&y>=0&&y<=2.2);previous=y;}
 const e=1e-5,l=(monotoneStation(c,1)[1]-monotoneStation(c,1-e)[1])/e,r=(monotoneStation(c,1+e)[1]-monotoneStation(c,1)[1])/e;assert.ok(Math.abs(l-r)<1e-4);assert.ok(r>.1);
});
test('R4 alternating extrema never overshoot',()=>{const c=[{x:0,d:[0,0,0]},{x:1,d:[1,2,-1]},{x:2,d:[0,1,0]}];for(let i=0;i<=200;i++){const d=monotoneStation(c,i/100);assert.ok(d[0]>=0&&d[0]<=1&&d[1]>=0&&d[1]<=2&&d[2]>=-1&&d[2]<=0);}});
