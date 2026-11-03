// Authenticated, same-origin R2 fetches. Never touches public object URLs or access secrets.
const MANIFEST='/api/shorekeeper/manifest',ASSET='/api/shorekeeper/asset';
const MAX_BYTES=130000000;
function valid(entry){
 return !!entry&&typeof entry.name==='string'&&/^[a-z0-9][a-z0-9._-]*\.glb$/.test(entry.name)&&
  Number.isSafeInteger(entry.bytes)&&entry.bytes>16&&entry.bytes<=MAX_BYTES&&
  typeof entry.sha256==='string'&&/^[0-9a-f]{64}$/.test(entry.sha256);
}
export async function getPrivateManifest({signal}={}){
 try{
  const response=await fetch(MANIFEST,{credentials:'same-origin',cache:'no-store',signal,headers:{Accept:'application/json'}});
  if(!response.ok)return null;
  const data=await response.json();
  if(data.schema!=='shorekeeper-private-assets/v1'||!valid(data.model)||!Array.isArray(data.libraries)||data.libraries.length>4)return null;
  if(!data.libraries.every(x=>valid(x)&&typeof x.id==='string'&&/^[a-z0-9][a-z0-9_-]{0,39}$/.test(x.id)))return null;
  return data;
 }catch{return null;}
}
export async function getPrivateFile(entry,{kind='model',signal}={}){
 if(!valid(entry)||!['model','library'].includes(kind))throw Error('Manifesto de asset privado inválido.');
 const url=ASSET+'?kind='+kind+(kind==='library'?'&id='+encodeURIComponent(entry.id):'');
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal});
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
