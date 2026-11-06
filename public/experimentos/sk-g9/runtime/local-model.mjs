/* G9 preview: browser-only GLB validator; no private cache, model fingerprints, or network loader. */
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
