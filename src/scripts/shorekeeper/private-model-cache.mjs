/**
 * User-authorized, same-origin IndexedDB storage for a private, locally supplied GLB.
 * Never fetches a remote GLB or uploads bytes to the server.
 */
export const SHOREKEEPER_CANONICAL=Object.freeze({
 filename:'PRIVATE_shorekeeper_f20a_original_idles.glb',
 sha256:'4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30',
 bytes:39487548,
 clips:Object.freeze(['SK_IDLE_01_ORIGINAL','SK_IDLE_02_ORIGINAL','SK_IDLE_03_ORIGINAL'])
});
const DATABASE='shorekeeper-private-glb-cache';
const STORE='models';
const KEY='local-canonical';
const MAX_BYTES=130*1024*1024;

/**
 * Return the result only after the transaction commits; a resolved request does
 * not guarantee that its enclosing transaction completed.
 */
function transaction(mode,operation){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(Error('IndexedDB indisponível neste navegador.'));return;}
  let request;
  try{request=indexedDB.open(DATABASE,1);}catch(e){reject(e);return;}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
  };
  request.onerror=()=>reject(request.error??Error('Erro ao abrir cache privado.'));
  request.onsuccess=()=>{
   const db=request.result;
   let result,done=false;
   try{
    const tx=db.transaction(STORE,mode);
    const op=operation(tx.objectStore(STORE));
    op.onsuccess=()=>{result=op.result;};
    tx.oncomplete=()=>{done=true;db.close();resolve(result);};
    tx.onabort=()=>{if(!done){done=true;db.close();reject(tx.error??Error('Cache privado abortado.'));}};
    tx.onerror=()=>{if(!done){done=true;db.close();reject(tx.error??Error('Erro no cache privado.'));}};
   }catch(e){db.close();reject(e);}
  };
 });
}
export async function readPrivateModel(){
 const record=await transaction('readonly',store=>store.get(KEY));
 if(!record?.blob||typeof record.filename!=='string')return null;
 const file=new File([record.blob],record.filename,{type:'model/gltf-binary',lastModified:record.savedAt??Date.now()});
 return {file,sha256:record.sha256??null,savedAt:record.savedAt??null};
}
export async function savePrivateModel(file,sha256){
 if(!file||typeof file.size!=='number'||!(/\.glb$/i).test(file.name??''))throw Error('Selecione um arquivo GLB local válido.');
 if(file.size<20||file.size>MAX_BYTES)throw Error('O GLB excede o limite de 130 MB ou está vazio.');
 if(!(/^[0-9a-f]{64}$/i).test(sha256??''))throw Error('O arquivo precisa ter SHA-256 verificado pelo carregador.');
 const savedAt=Date.now();
 await transaction('readwrite',store=>store.put({id:KEY,filename:file.name,sha256:sha256.toLowerCase(),savedAt,blob:file}));
 return {filename:file.name,sha256:sha256.toLowerCase(),savedAt,bytes:file.size};
}
export async function forgetPrivateModel(){
 await transaction('readwrite',store=>store.delete(KEY));
}
