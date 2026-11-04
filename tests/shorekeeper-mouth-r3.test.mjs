import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothStation} from '../src/scripts/shorekeeper/mouth-r3.mjs';

test('mouth interpolation joins every station with C1 tangents, no centre derivative jump',()=>{
 const curve=[{x:.001,d:[0,0,0]},{x:.004,d:[0,.001,0]},{x:.012,d:[0,.002,0]}],e=1e-8;
 for(const p of curve){const a=smoothStation(curve,p.x-e),b=smoothStation(curve,p.x),c=smoothStation(curve,p.x+e);assert.ok(Math.abs((c[1]-b[1])/e-(b[1]-a[1])/e)<.0001);}
});
