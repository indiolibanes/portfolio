// Authenticated, same-origin R2 fetches. Never touches public object URLs or access secrets.
const ENDPOINTS=Object.freeze({
 private:{manifest:'/api/shorekeeper/manifest',asset:'/api/shorekeeper/asset',schema:'shorekeeper-private-assets/v1'},
 public:{manifest:'/api/stage/shorekeeper/manifest',asset:'/api/stage/shorekeeper/asset',schema:'shorekeeper-stage-assets/v1'}
});
const endpoint=source=>{
 if(source!=='private'&&source!=='public')throw Error('Invalid Shorekeeper asset source');
 return ENDPOINTS[source];
};
const MAX_BYTES=130000000;
function valid(entry){
 return !!entry&&typeof entry.name==='string'&&/^[a-z0-9][a-z0-9._-]*\.glb$/.test(entry.name)&&
  Number.isSafeInteger(entry.bytes)&&entry.bytes>16&&entry.bytes<=MAX_BYTES&&
  typeof entry.sha256==='string'&&/^[0-9a-f]{64}$/.test(entry.sha256);
}
/** Public-safe diagnostics: do not expose object keys, secrets, JWT or R2 errors. */
export async function inspectPrivateManifest({signal,source='private'}={}){
 const config=endpoint(source);
 try{
  const response=await fetch(config.manifest,{credentials:'same-origin',cache:source==='public'?'default':'no-store',signal,headers:{Accept:'application/json'}});
  if(response.status===401||response.status===403)return {state:'denied',manifest:null,httpStatus:response.status};
  if(response.status===503)return {state:'unconfigured',manifest:null,httpStatus:503};
  if(response.status===404)return {state:'missing',manifest:null,httpStatus:404};
  if(!response.ok)return {state:'unavailable',manifest:null,httpStatus:response.status};
  let data;try{data=await response.json();}catch{return {state:'invalid',manifest:null,httpStatus:200};}
  if(data.schema!==config.schema||!valid(data.model)||!Array.isArray(data.libraries)||data.libraries.length>4||
     !data.libraries.every(x=>valid(x)&&typeof x.id==='string'&&/^[a-z0-9][a-z0-9_-]{0,39}$/.test(x.id))||
     new Set(data.libraries.map(x=>x.id)).size!==data.libraries.length)return {state:'invalid',manifest:null,httpStatus:200};
  return {state:'ready',manifest:data,httpStatus:200};
 }catch(e){return {state:signal?.aborted?'cancelled':'network',manifest:null,httpStatus:null};}
}
/** Backward-compatible read for consumers needing only the manifest. */
export async function getPrivateManifest(options={}){
 return (await inspectPrivateManifest(options)).manifest;
}
export async function getPrivateFile(entry,{kind='model',signal,source='private'}={}){
 const config=endpoint(source);
 if(!valid(entry)||!['model','library'].includes(kind))throw Error('Invalid GLB asset entry');
 const url=config.asset+'?kind='+kind+(kind==='library'?'&id='+encodeURIComponent(entry.id):'')+(source==='public'?'&v='+entry.sha256:'');
 const response=await fetch(url,{credentials:'same-origin',cache:source==='public'?'default':'no-store',signal});
 if(!response.ok)throw Error('Asset privado indisponível ('+response.status+').');
 if(Number(response.headers.get('Content-Length'))!==entry.bytes||
    response.headers.get('X-Asset-SHA256')!==entry.sha256)throw Error('Metadados do asset remoto não conferem.');
 const buffer=await response.arrayBuffer();
 if(buffer.byteLength!==entry.bytes)throw Error('Download privado incompleto.');
 const digest=await crypto.subtle.digest('SHA-256',buffer);
 const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==entry.sha256)throw Error('Integridade SHA-256 remota inválida.');
 if(signal?.aborted)throw new DOMException('Cancelado','AbortError');
 return new File([buffer],entry.name,{type:'model/gltf-binary'});
}

/** Public presentation source. Administrative/private endpoints are unchanged. */
export const inspectPublicStageManifest=options=>inspectPrivateManifest({...options,source:'public'});
export const getPublicStageFile=(entry,options)=>getPrivateFile(entry,{...options,source:'public'});
