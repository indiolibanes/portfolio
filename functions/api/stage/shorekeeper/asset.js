import {releaseEnabled,currentRelease,releaseEntry,releaseError,releaseHeaders} from '../../../_lib/shorekeeper-public.mjs';
async function serve({request,env},method){
 if(!releaseEnabled(env))return releaseError(404);
 try{
  const params=new URL(request.url).searchParams;
  const kind=params.get('kind'),id=params.get('id'),v=params.get('v');
  const manifest=await currentRelease(env);
  if(!manifest)return releaseError(404);
  const entry=releaseEntry(manifest,{kind,id,version:v});
  if(!entry)return releaseError(404);
  const name=kind==='model'?'shorekeeper-main.glb':'shorekeeper-'+id+'.glb';
  // Browser revalidation must not re-download the 39 MB model on every warm visit.
  // Never return 304 before the rollout gate, release pin and R2 object are checked.
  const etag='"'+entry.sha256+'"';
  const condition=request.headers.get('If-None-Match');
  const unchanged=condition?.split(',').some(token=>{
   const t=token.trim();
   return t===etag||t==='W/'+etag||t==='*';
  })??false;
  const obj=method==='HEAD'||unchanged
   ?await env.SHOREKEEPER_ASSETS_R2.head(entry.key)
   :await env.SHOREKEEPER_ASSETS_R2.get(entry.key);
  if(!obj)return releaseError(404);
  if(obj.size!==entry.bytes)return releaseError(409);
  const headers=releaseHeaders(entry.sha256,entry.bytes,name);
  if(unchanged){
   headers.delete('Content-Length');
   headers.delete('Content-Disposition');
   return new Response(null,{status:304,headers});
  }
  return new Response(method==='HEAD'?null:obj.body,{status:200,headers});
 }catch{return releaseError(503);}
}
export const onRequestGet=context=>serve(context,'GET');
export const onRequestHead=context=>serve(context,'HEAD');
