import * as T from 'three';
import {writeFileSync} from 'node:fs';
import {ShorekeeperVfxDirector,VFX_STATES} from '../src/scripts/shorekeeper/vfx-director.mjs';
const results=[];
for(const mobile of [true,false]){
 const scene=new T.Scene(),vfx=new ShorekeeperVfxDirector(scene,{mobile});vfx.bindModel(null);const start=performance.now();
 for(let frame=0;frame<36000;frame++){if(frame%600===0)vfx.setState(VFX_STATES[(frame/600)%VFX_STATES.length]);vfx.update(1/60);}
 results.push({...vfx.report(),wallTimeMs:performance.now()-start,rendering:'NOT_EXECUTED',session:'600 seconds simulated at 60Hz, NOT a 600s browser session'});vfx.dispose();
}
const report={runtime:process.version,platform:process.platform,architecture:process.arch,scope:'CPU-only director update, no model, no WebGL renderer/GPU/Android measurements',results};
writeFileSync('docs/characters/shorekeeper-vfx-r1-cpu.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
