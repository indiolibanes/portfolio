import {checkPrivateAccess,readManifest,privateError,PRIVATE_HEADERS} from '../../_lib/shorekeeper-private.mjs';
async function serve({request,env},method){
 const denied=await checkPrivateAccess(request,env);if(denied)return denied;
 try{
  const query=new URL(request.url).searchParams;
  const kind=query.get('kind');
  if(kind!=='model'&&kind!=='library')return privateError(404);
  const manifest=await readManifest(env.SHOREKEEPER_ASSETS_R2);
  if(!manifest)return privateError(404);
  const entry=kind==='model'?manifest.model:manifest.libraries.find(x=>x.id===query.get('id'));
  if(!entry)return privateError(404);
  const obj=method==='HEAD'
   ?await env.SHOREKEEPER_ASSETS_R2.head(entry.key)
   :await env.SHOREKEEPER_ASSETS_R2.get(entry.key);
  if(!obj)return privateError(404);
  if(obj.size!==entry.bytes)return privateError(409);
  const headers=new Headers(PRIVATE_HEADERS);
  headers.set('Content-Type','model/gltf-binary');
  headers.set('Content-Length',String(entry.bytes));
  headers.set('Content-Disposition','inline; filename="'+entry.name+'"');
  headers.set('X-Asset-SHA256',entry.sha256);
  return new Response(method==='HEAD'?null:obj.body,{status:200,headers});
 }catch{return privateError(503);}
}
export const onRequestGet=context=>serve(context,'GET');
export const onRequestHead=context=>serve(context,'HEAD');
