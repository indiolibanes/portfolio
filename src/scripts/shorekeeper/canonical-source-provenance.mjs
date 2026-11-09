/** Clip-object provenance tied to immutable source Files whose full SHA was checked by the loader.
 * ART acquisition records cheap receipts only. Reparse/digests happen on explicit FID use, never per frame.
 */
import {assertSelfContainedGLB} from './local-model.mjs';
const known=new Map([
 ['4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30',/^SK_IDLE_0[123]_ORIGINAL(?:_BODY|_RIB)?$/],
 ['2efd607ea7d47f9d43c67eb1e0da7bb08445acb63eed60b66296966bb6fd318e',/^SK_ATTACK_0[1234]_ORIGINAL(?:_BODY|_RIB)?$/],
 ['dfb8086c4c41cdc65a71ca5a9e8465e77f23cd2e50223cb5e79522d32363306a',/^SK_(?:ATTACK_L02|SKILL_01|SKILL_QTE_01|AIR_SKILL_01)_ORIGINAL(?:_BODY|_RIB)?$/],
 ['984f7b58ae5b32560509834d75793fd298e51b49a2a062a4a7a7fba85b6fc35e',/^SK_BURST_0[12]_ORIGINAL(?:_BODY|_RIB)?$/]
]);
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function canonicalClipSignature(clip){const json=clip.toJSON();delete json.uuid;return digest(new TextEncoder().encode(JSON.stringify(json)));}
async function readVerifiedSource(file,sha,match){
 const raw=await file.arrayBuffer();if(await digest(raw)!==sha)throw Error('Source file digest changed');
 const json=assertSelfContainedGLB(raw),length=new DataView(raw).getUint32(12,true);
 // Disposable CPU animation parse only. No saved GLB, texture decode or model reconstruction.
 for(const n of json.nodes??[]){delete n.mesh;delete n.skin;delete n.extensions;}
 for(const key of ['meshes','skins','materials','images','textures','extensions'])delete json[key];json.scenes=[{nodes:[]}];json.scene=0;
 const text=new TextEncoder().encode(JSON.stringify(json)),padded=Math.ceil(text.length/4)*4,tail=new Uint8Array(raw,20+length),bytes=new Uint8Array(20+padded+tail.byteLength),view=new DataView(bytes.buffer);view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,bytes.byteLength,true);view.setUint32(12,padded,true);view.setUint32(16,0x4e4f534a,true);bytes.fill(32,20,20+padded);bytes.set(text,20);bytes.set(tail,20+padded);
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const parsed=await new GLTFLoader().parseAsync(bytes.buffer,'');
 const signatures=new Map();for(const clip of parsed.animations)if(match.test(clip.name))signatures.set(clip.name,await canonicalClipSignature(clip));return signatures;
}
export function createCanonicalProvenance({readOriginal=readVerifiedSource}={}){
 const receipts=new WeakMap(),files=new WeakMap();
 return {
  record(result,{file}={}){const match=known.get(result?.sha256);if(!match||!file||typeof file.arrayBuffer!=='function')return 0;
   let source=files.get(file);if(!source||source.sha256!==result.sha256){source={file,sha256:result.sha256,match,task:null};files.set(file,source);}let n=0;
   for(const clip of result.gltf?.animations??[])if(match.test(clip.name)){receipts.set(clip,source);n++;}return n;
  },
  receipt(clip){const r=receipts.get(clip);return r?{sha256:r.sha256}:null;},
  async verified(clip){const r=receipts.get(clip);if(!r)return false;
   // Expected signatures derive from the immutable file, not from potentially modified live tracks.
   if(!r.task)r.task=readOriginal(r.file,r.sha256,r.match).then(map=>{r.file=null;return map;}).catch(e=>{r.task=null;throw e;});
   const expected=(await r.task).get(clip.name);return !!expected&&expected===await canonicalClipSignature(clip);
  },
  async require(library,ids){for(const id of ids){const matches=library.filter(c=>c.name===id);if(matches.length!==1||!await this.verified(matches[0]))throw Error('SOURCE_UNAVAILABLE_OR_UNVERIFIED: '+id);}return true;}
 };
}
export const canonicalProvenance=createCanonicalProvenance();
export const recordCanonicalSources=(...args)=>canonicalProvenance.record(...args);
export const canonicalSourceReceipt=clip=>canonicalProvenance.receipt(clip);
export const canonicalSourceVerified=clip=>canonicalProvenance.verified(clip);
export const requireCanonicalSources=(...args)=>canonicalProvenance.require(...args);
