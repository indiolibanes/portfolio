/** Offline follow-up for files acquired through the authenticated project flow. Never fetches or publishes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {assertSelfContainedGLB,disposeObject} from '../../src/scripts/shorekeeper/local-model.mjs';
import {SHOREKEEPER_CANONICAL} from '../../src/scripts/shorekeeper/private-model-cache.mjs';
import {validateCombatLibrary} from '../../src/scripts/shorekeeper/combat-director.mjs';
import {PRIVATE_COMBAT_BUNDLES} from '../../src/scripts/shorekeeper/private-library-coverage.mjs';
import {sampleSourceMotion} from '../../src/scripts/shorekeeper/source-motion-audit.mjs';
const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function clipFingerprint(clip){
 const h=createHash('sha256');h.update(clip.name+'\0'+clip.duration+'\0');
 for(const t of [...clip.tracks].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){h.update(t.name+'\0'+t.getInterpolation()+'\0');for(const a of [t.times,t.values])h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}return h.digest('hex');
}
export async function parseDataOnly(bytes){
 const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),json=assertSelfContainedGLB(buffer);
 const manager=new T.LoadingManager();manager.setURLModifier(()=>{throw Error('External resource forbidden in offline audit');});
 const loader=new GLTFLoader(manager);loader.register(()=>({name:'DATA_ONLY_NO_TEXTURE_DECODING',loadTexture:async()=>new T.Texture()}));
 return {json,gltf:await loader.parseAsync(buffer,'')};
}
export async function runPrivateAudit({directory,calibrationFile,output}){
 const source=await fs.realpath(directory),out=path.resolve(output),parent=await fs.realpath(path.dirname(out));
 if(out===repository||out.startsWith(repository+path.sep)||parent===repository||parent.startsWith(repository+path.sep))throw Error('Private reports must be outside the repository');
 // Exclusive creation prevents symlink/overwrite surprises and accidental promotion of prior evidence.
 await fs.mkdir(out,{mode:0o700});
 const scenes=[];
 try{
  const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
  if(manifest.schema!=='shorekeeper-private-assets/v1'||manifest.model?.sha256!==SHOREKEEPER_CANONICAL.sha256||manifest.model.bytes!==SHOREKEEPER_CANONICAL.bytes||!Array.isArray(manifest.libraries)||manifest.libraries.length!==3||new Set(manifest.libraries.map(x=>x.id)).size!==3)throw Error('Canonical model and three authenticated bundle identities required');
  const calibration=JSON.parse(await fs.readFile(calibrationFile,'utf8'));
  async function load(entry){
   if(!/^[a-z0-9][a-z0-9._-]*\.glb$/.test(entry.name)||!/^[a-f0-9]{64}$/.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<=16||entry.bytes>130000000)throw Error('Invalid private entry');
   const file=await fs.realpath(path.join(source,entry.name));if(!file.startsWith(source+path.sep))throw Error('Source path escapes private directory');
   const bytes=await fs.readFile(file),sha256=createHash('sha256').update(bytes).digest('hex');if(bytes.length!==entry.bytes||sha256!==entry.sha256)throw Error('Private source hash/size mismatch');
   const parsed=await parseDataOnly(bytes);scenes.push(parsed.gltf.scene);return {...parsed,sha256};
  }
  const model=await load(manifest.model),clips=new Map(),entries=[];
  for(const bundle of PRIVATE_COMBAT_BUNDLES){
   const entry=manifest.libraries.find(x=>x.id===bundle.id);if(!entry)throw Error('Missing required bundle');
   const data=await load(entry),library=validateCombatLibrary(T,model.gltf.scene,data);
   for(const id of bundle.ids){const clip=library.find(c=>c.name===id);if(!clip)throw Error('Expected composed source clip absent');clips.set(id,{clip,sourceHash:data.sha256,clipHash:clipFingerprint(clip)});}
   entries.push({id:bundle.id,sha256:data.sha256,recognized:bundle.ids.length});
  }
  // Exercise real AnimationMixer bindings for all ten clips, without renderer/texture decoding.
  const mixer=new T.AnimationMixer(model.gltf.scene);
  try{for(const {clip} of clips.values()){const a=mixer.clipAction(clip);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.play();a.paused=true;for(const t of [0,clip.duration/2,clip.duration]){a.time=t;mixer.update(0);model.gltf.scene.updateMatrixWorld(true);model.gltf.scene.traverse(o=>{if(o.isBone&&![...o.position,...o.quaternion,...o.scale].every(Number.isFinite))throw Error('Nonfinite source pose');});}mixer.stopAllAction();}}finally{mixer.stopAllAction();mixer.uncacheRoot(model.gltf.scene);}
  // The mixer restores the original bind pose before any diagnostic variant is derived.
  for(const id of ['SK_BURST_01_ORIGINAL','SK_BURST_02_ORIGINAL'])for(const fps of [30,60])for(const variant of ['ORIGINAL','REBASED','ROOT_BODY_OWNED']){
   const item=clips.get(id),report=sampleSourceMotion(model.gltf.scene,item.clip,{fps,variant,sourceHash:item.sourceHash,clipHash:item.clipHash,provenance:'VERIFIED_BYTES',calibration});
   await fs.writeFile(path.join(out,`${id}_${variant}_${fps}.json`),JSON.stringify(report),{mode:0o600,flag:'wx'});
  }
  const summary={schema:'shorekeeper.private-source-summary/1',canonicalModelSha256:model.sha256,bundles:entries,recognizedClips:clips.size,rendering:'NOT_PERFORMED_DATA_ONLY',mapping:'LIBERATION_MAPPING_UNVERIFIED',visualQA:'PENDING',sourceFrame:'UNRESOLVED',markers:[]};
  await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2),{mode:0o600,flag:'wx'});return summary;
 }finally{for(const scene of scenes)disposeObject(scene);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==3){console.error('Usage: node scripts/shorekeeper/audit-private-source.mjs PRIVATE_DIRECTORY CALIBRATION_JSON PRIVATE_OUTPUT_DIRECTORY');process.exitCode=1;}
 else try{const r=await runPrivateAudit({directory:args[0],calibrationFile:args[1],output:args[2]});console.log(JSON.stringify(r));}catch(e){console.error('SOURCE_AUDIT_BLOCKED: '+e.message);process.exitCode=1;}
}
