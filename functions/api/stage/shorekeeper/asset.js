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
  const obj=method==='HEAD'
   ?await env.SHOREKEEPER_ASSETS_R2.head(entry.key)
   :await env.SHOREKEEPER_ASSETS_R2.get(entry.key);
  if(!obj)return releaseError(404);
  if(obj.size!==entry.bytes)return releaseError(409);
  const headers=releaseHeaders(entry.sha256,entry.bytes,name);
  return new Response(method==='HEAD'?null:obj.body,{status:200,headers});
 }catch{return releaseError(503);}
}
export const onRequestGet=context=>serve(context,'GET');
export const onRequestHead=context=>serve(context,'HEAD');
