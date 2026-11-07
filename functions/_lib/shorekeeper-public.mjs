/**
 * Public, read-only stage release gateway.
 * No R2 object keys, source filenames or admin credentials are transmitted.
 * Explicit rollout switch; not a substitute for asset distribution rights.
 */
import {readManifest,MANIFEST_SCHEMA} from './shorekeeper-private.mjs';

export const RELEASE_SCHEMA='shorekeeper-stage-assets/v1';
export const CANONICAL_MODEL_SHA='4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30';
export const CANONICAL_MODEL_BYTES=39487548;
const REQUIRED=Object.freeze(['basic','advanced','burst']);
export const RELEASE_BASE_HEADERS=Object.freeze({
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Cross-Origin-Resource-Policy':'same-origin'
});
export function releaseEnabled(env){
 return !!env?.SHOREKEEPER_ASSETS_R2&&env.SK_PUBLIC_STAGE_ENABLED==='1';
}
export function releaseError(status=404){
 return new Response(null,{status,headers:{...RELEASE_BASE_HEADERS,'Cache-Control':'no-store'}});
}
export function validateRelease(manifest){
 if(!manifest||manifest.schema!==MANIFEST_SCHEMA||
    manifest.model?.sha256!==CANONICAL_MODEL_SHA||
    manifest.model?.bytes!==CANONICAL_MODEL_BYTES||
    !REQUIRED.every(id=>manifest.libraries?.some(x=>x.id===id)))
    throw Error('Stage assets not approved');
 return manifest;
}
export function publicReleaseManifest(m){
 const source=validateRelease(m);
 const publicAsset=(asset,name)=>({name,bytes:asset.bytes,sha256:asset.sha256});
 return {
  schema:RELEASE_SCHEMA,
  model:publicAsset(source.model,'shorekeeper-main.glb'),
  libraries:source.libraries.map(x=>({id:x.id,...publicAsset(x,'shorekeeper-'+x.id+'.glb')}))
 };
}
export async function currentRelease(env){
 const manifest=await readManifest(env.SHOREKEEPER_ASSETS_R2);
 return manifest?validateRelease(manifest):null;
}
export function releaseEntry(manifest,{kind,id,version}){
 if(!/^[0-9a-f]{64}$/.test(version??''))return null;
 if(kind!=='model'&&kind!=='library')return null;
 const item=kind==='model'?manifest.model:manifest.libraries.find(x=>x.id===id);
 return item?.sha256===version?item:null;
}
export function releaseHeaders(version,bytes,name){
 return new Headers({
  ...RELEASE_BASE_HEADERS,
  'Content-Type':'model/gltf-binary',
  'Content-Length':String(bytes),
  'Content-Disposition':'inline; filename="'+name+'"',
  'X-Asset-SHA256':version,
  ETag:'"'+version+'"',
  'Cache-Control':'public, max-age=31536000, immutable',
  'Cloudflare-CDN-Cache-Control':'public, max-age=31536000, immutable'
 });
}
