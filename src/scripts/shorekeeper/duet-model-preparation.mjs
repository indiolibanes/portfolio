/** One attempt-scoped authenticated byte preparation. No renderer, parse, cache write or animation clock. */
import {inspectPrivateManifest,getPrivateFile} from './remote-private-model.mjs';
import {SHOREKEEPER_CANONICAL,readPrivateModel} from './private-model-cache.mjs';
export function s6DuoModelRequirements(manifest,hash=SHOREKEEPER_CANONICAL.sha256){
 return !!manifest&&['shorekeeper-private-assets/v1','shorekeeper-stage-assets/v1'].includes(manifest.schema)&&manifest.model?.sha256===hash&&manifest.model?.bytes===SHOREKEEPER_CANONICAL.bytes;
}
export function prepareDuetModel({signal,inspect=inspectPrivateManifest,readCache=readPrivateModel,fetchFile=getPrivateFile,now=()=>performance.now()}={}){
 const controller=new AbortController(),started=now(),timings={};
 let disposed=false,claimed=false,state='preparing',cache='not_checked',modelRequests=0,modelBytes=0;
 const cancel=()=>controller.abort();if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 const check=()=>{if(disposed||controller.signal.aborted)throw new DOMException('Cancelled','AbortError');};
 const mark=name=>{timings[name]=Math.max(0,now()-started);};
 let task=(async()=>{
  try{
   check();const inspected=await inspect({signal:controller.signal});check();mark('manifest');
   if(inspected.state!=='ready'){state=inspected.state;return {ready:false,state};}
   const manifest=inspected.manifest;if(!s6DuoModelRequirements(manifest)){state='incomplete';return {ready:false,state};}
   // Never inspect or reuse IndexedDB before the current Access authorization succeeds.
   const cached=await readCache().catch(()=>null);check();let buffer=null;
   if(cached?.sha256===manifest.model.sha256&&cached.file?.size===manifest.model.bytes){
    const bytes=await cached.file.arrayBuffer();check();
    const hash=await crypto.subtle.digest('SHA-256',bytes);check();
    const hex=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
    if(bytes.byteLength===manifest.model.bytes&&hex===manifest.model.sha256){buffer=bytes;cache='verified_hit';}else cache='invalid';
   }else cache='miss';mark('cacheVerified');
   if(!buffer){modelRequests++;const file=await fetchFile(manifest.model,{kind:'model',signal:controller.signal});check();buffer=await file.arrayBuffer();check();modelBytes=buffer.byteLength;mark('downloadVerified');}
   state='ready';mark('bytesReady');return {ready:true,manifest,buffer};
  }catch(error){state=controller.signal.aborted||disposed?'cancelled':'failed';return state==='cancelled'?null:{ready:false,state};}
  finally{signal?.removeEventListener('abort',cancel);}
 })();
 return {
  async take(){if(claimed||disposed||signal?.aborted)return null;claimed=true;const pending=task;task=null;const result=await pending;if(disposed||controller.signal.aborted||signal?.aborted)return null;return result;},
  dispose(){if(disposed)return;disposed=true;controller.abort();task=null;state='cancelled';signal?.removeEventListener('abort',cancel);},
  report(){return {state,cache,modelRequests,modelBytes,libraryRequests:0,timingsMs:{...timings},note:'Attempt wall times; not CPU render, TTFP, GPU or VRAM.'};}
 };
}
