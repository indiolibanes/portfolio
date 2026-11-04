import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {LoadingManager} from 'three';
import {SHOREKEEPER_CANONICAL} from './private-model-cache.mjs';
export const F16_HASH='39a45609b86699a49200cc1931227e3e4ae6ec15af8ed4ddc87d3dd982e7af61';
export function assertSelfContainedGLB(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20)throw Error('Arquivo GLB 2.0 inválido.');
 const d=new DataView(buffer);
 if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==buffer.byteLength)throw Error('Cabeçalho GLB 2.0 inválido ou arquivo incompleto.');
 let offset=12,json;
 while(offset<buffer.byteLength){if(offset+8>buffer.byteLength)throw Error('Chunk GLB truncado.');const n=d.getUint32(offset,true),type=d.getUint32(offset+4,true);if(n%4||offset+8+n>buffer.byteLength)throw Error('Chunk GLB inválido.');if(offset===12){if(type!==0x4e4f534a)throw Error('Primeiro chunk deve ser JSON.');json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset+8,n)));}offset+=8+n;}
 if(json?.asset?.version!=='2.0')throw Error('Versão glTF não suportada.');
 const check=value=>{if(!value||typeof value!=='object')return;for(const [key,v] of Object.entries(value)){if(key==='uri'&&(typeof v!=='string'||!/^data:(?:image\/(?:png|jpeg|webp)|application\/(?:octet-stream|gltf-buffer));base64,/i.test(v)))throw Error('GLB contém referência externa ou URI não autorizada.');check(v);}};
 check(json);return json;
}
export function disposeObject(object,extraMaterials=[]){
 const geo=new Set(),mat=new Set(extraMaterials),tex=new Set(),sk=new Set(),images=new Set();
 object?.traverse(o=>{if(o.geometry)geo.add(o.geometry);if(o.skeleton)sk.add(o.skeleton);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])mat.add(m);});
 for(const m of mat)for(const t of Object.values(m))if(t?.isTexture)tex.add(t);
 for(const s of sk)s.dispose();for(const g of geo)g.dispose();for(const m of mat)m.dispose();for(const t of tex){t.dispose();if(t.image)images.add(t.image);}for(const im of images)im.close?.();
 return {geometries:geo.size,materials:mat.size,textures:tex.size,skeletons:sk.size};
}
function readLocal(file,signal,progress){return new Promise((resolve,reject)=>{const reader=new FileReader();const abort=()=>reader.abort();signal.addEventListener('abort',abort,{once:true});const clean=()=>signal.removeEventListener('abort',abort);reader.onprogress=e=>progress(e.lengthComputable?e.loaded/e.total:0);reader.onload=()=>{clean();resolve(reader.result)};reader.onerror=()=>{clean();reject(Error('Falha de leitura do arquivo local.'))};reader.onabort=()=>{clean();reject(new DOMException('Leitura cancelada','AbortError'))};if(signal.aborted){reject(new DOMException('Cancelado','AbortError'));return;}reader.readAsArrayBuffer(file);});}
/** Only the newest request can adopt resources. A stale parse is disposed in isolation. */
export function createLocalLoader({parse,read=readLocal,hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join(''),dispose=g=>disposeObject(g.scene)}={}){
 let generation=0,abort;
 if(!parse){const manager=new LoadingManager();manager.setURLModifier(url=>{if(!/^(blob:|data:)/i.test(url))throw Error('Recurso externo bloqueado.');return url;});const loader=new GLTFLoader(manager);parse=b=>loader.parseAsync(b,'');}
 return {cancel(){generation++;abort?.abort();},async load(file,progress=()=>{}){
 const id=++generation;abort?.abort();abort=new AbortController();const signal=abort.signal;
 const current=()=>id===generation&&!signal.aborted;
 if(!file||file.size>130_000_000)throw Error('Selecione um GLB de até 130 MB.');
 const buffer=await read(file,signal,v=>{if(current())progress({stage:'Leitura local',value:v*.65});});if(!current())return null;
 const json=assertSelfContainedGLB(buffer);progress({stage:'Identificação SHA-256',value:.7});const sha256=await hash(buffer);if(!current())return null;
 progress({stage:'Preparando malhas e texturas',value:.85});if(!current())return null;
 const gltf=await parse(buffer);if(!current()){dispose(gltf);return null;}
 // Progress observers can synchronously cancel, replace this load or throw.
 // Ownership transfers to the caller only after the completion observer returns.
 try{progress({stage:'Concluído',value:1});}catch(error){dispose(gltf);throw error;}
 if(!current()){dispose(gltf);return null;}
 const version=sha256===SHOREKEEPER_CANONICAL.sha256?'F2.0-A · canônico · três idles originais':sha256===F16_HASH?'F1.6 · bounds corrigidos':'GLB não reconhecido · inspeção permitida';
 return {gltf,sha256,json,version,modelStatus:sha256===SHOREKEEPER_CANONICAL.sha256?'CANONICAL':sha256===F16_HASH?'LEGACY':'UNKNOWN'};
 }};
}
