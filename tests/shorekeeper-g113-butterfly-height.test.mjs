import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GIANT_BUTTERFLY_MIN_CENTER_HEIGHT_H,giantButterflyCenterY} from '../src/scripts/shorekeeper/combat-vfx-liberation.mjs';

test('G11.3 giant butterfly clears the stage floor at chest-level source poses',()=>{
 const floorY=0,height=1.55,chestY=0.83;
 const oldCenter=chestY+0.05*height;
 const next=giantButterflyCenterY(chestY,floorY,height);
 assert(next>oldCenter,'large billboard must rise above its former chest-level anchor');
 assert(next>=floorY+GIANT_BUTTERFLY_MIN_CENTER_HEIGHT_H*height);
 assert.equal(next,2.6*height);
});
test('G11.3 butterfly lift does not lower a preexisting high chest anchor',()=>{
 const floorY=-1,height=1.4,chestY=4;
 assert.equal(giantButterflyCenterY(chestY,floorY,height),chestY+0.05*height);
 assert.equal(giantButterflyCenterY(1,undefined,1.5),1+0.05*1.5+1.2*1.5,'legacy stage without floor still lifts the effect');
 assert.throws(()=>giantButterflyCenterY(0,0,0),RangeError);
 assert.throws(()=>giantButterflyCenterY(Number.NaN,0,1),RangeError);
});
test('G11.3 burst center and particle cloud share the raised anchor; ground ring remains grounded',()=>{
 const src=readFileSync(new URL('../src/scripts/shorekeeper/combat-vfx-liberation.mjs',import.meta.url),'utf8');
 assert.match(src,/bfc\.set\(c\.P\.chest\.x, giantButterflyCenterY\(c\.P\.chest\.y, c\.stage\.floorY, h\), c\.P\.chest\.z\)/);
 assert.match(src,/k\.uCenter\.value\.copy\(bfc\)/);
 assert.match(src,/const u = cs\.bf\.burst, base = bfc/);
 assert.match(src,/field\.position\.set\(c\.stage\.x, c\.stage\.floorY \+ 0\.006 \* h, c\.stage\.z\)/);
 assert.match(src,/focus\.copy\(c\.P\.lh\); focus\.y \+= 0\.17 \* h/);
});
