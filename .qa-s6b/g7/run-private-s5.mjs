/** Private-only S6-B G7 diagnostic. No public asset fetch, upload or source edits.
 * node .qa-s6b/g7/run-private-s5.mjs PRIVATE_KIT_DIR PRIVATE_OUTPUT_DIR
 * All input hashes verified before parsing; outputs must be OUTSIDE a Git checkout.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as T from 'three';
import {parseDataOnly} from '../../scripts/shorekeeper/audit-private-source.mjs';
import {validateCombatLibrary} from '../../src/scripts/shorekeeper/combat-director.mjs';
import {createRebasedBurstClip,createBindRootBurstClip} from '../../src/scripts/shorekeeper/liberation-rotation.mjs';
import {disposeObject} from '../../src/scripts/shorekeeper/local-model.mjs';
import {normalizeExpectedManifest} from './expected-manifest.mjs';
import {auditS6bG7} from './s5-seams.mjs';

const [kit,out]=process.argv.slice(2).map(x=>x&&path.resolve(x));
if(!kit||!out)throw Error('Usage: node .qa-s6b/g7/run-private-s5.mjs PRIVATE_KIT_DIR PRIVATE_OUTPUT_DIR');
const inGit=p=>{try{return execFileSync('git',['-C',p,'rev-parse','--is-inside-work-tree'],{stdio:'pipe'}).toString().trim()==='true';}catch{return false;}};
await fs.mkdir(path.dirname(out),{recursive:true});
if(inGit(path.dirname(out))||inGit(kit))throw Error('Private kit/output must be outside Git checkout');
await fs.mkdir(out,{recursive:false,mode:0o700});
const expected=normalizeExpectedManifest(JSON.parse(await fs.readFile(path.join(kit,'expected.json'),'utf8')));
const scenes=[],library=[];
async function readVerified(name){
 const row=expected.get(name);if(!row)throw Error('Missing expected.json record: '+name);
 const raw=await fs.readFile(path.join(kit,name)),sha=createHash('sha256').update(raw).digest('hex');
 if(sha!==row.sha256||(row.bytes!==undefined&&raw.length!==row.bytes))throw Error('Private source hash/size mismatch: '+name);
 const parsed=await parseDataOnly(raw);scenes.push(parsed.gltf.scene);return parsed.gltf;
}
try{
 const model=await readVerified('shorekeeper-f20a.glb');
 for(const name of ['basic.glb','advanced.glb','burst.glb']){
  const data=await readVerified(name);
  for(const clip of validateCombatLibrary(T,model.scene,data)){
   library.push(clip);
   if(clip.name==='SK_BURST_02_ORIGINAL'){
    library.push(createRebasedBurstClip(T,model.scene,clip).clip);
    library.push(createBindRootBurstClip(T,model.scene,clip).clip);
   }
  }
 }
 for(const clip of model.animations??[])if(!library.some(x=>x.name===clip.name))library.push(clip);
 const report=auditS6bG7(T,model.scene,library);
 report.inputs='BYTE_VERIFIED_PRIVATE_KIT; raw hashes withheld from report';
 const json=path.join(out,'S6B_G7_S5_REAL_SCHEDULE_PRIVATE.json');
 await fs.writeFile(json,JSON.stringify(report,null,2),{encoding:'utf8',mode:0o600,flag:'wx'});
 const header='variant,join,from,to,start,fade,source_gap_start_max_deg,source_gap_root_step_native,source_gap_root_yaw_deg,step30_max_deg,step30_foot_native,step60_max_deg,step60_foot_native,visual_verdict,source_frame';
 const rows=[header];
 for(const [v,r] of Object.entries(report.variants))for(let i=0;i<(r.joins??[]).length;i++){
  const j=r.joins[i],a=r.cadences[30][i],b=r.cadences[60][i];
  rows.push([v,j.join,j.from,j.to,j.start,j.fade,j.sourceGapAtBlendStart.maxLocalDeg,j.sourceGapAtBlendStart.world.Root.step,
   j.sourceGapAtBlendStart.world.Root.yawDeltaDeg,a.maxLocalStepDeg,a.maxFootStep,b.maxLocalStepDeg,b.maxFootStep,'PENDING','UNKNOWN'].join(','));
 }
 await fs.writeFile(path.join(out,'S6B_G7_S5_REAL_SCHEDULE_PRIVATE.csv'),rows.join('\n')+'\n',{encoding:'utf8',mode:0o600,flag:'wx'});
 console.log('S6-B numeric G7 outputs written only to external private directory; G7 stays NO_GO.');
}finally{for(const scene of scenes)disposeObject(scene);}
