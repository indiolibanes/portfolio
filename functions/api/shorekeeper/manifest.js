import {checkPrivateAccess,readManifest,privateError,PRIVATE_HEADERS} from '../../_lib/shorekeeper-private.mjs';
export async function onRequestGet({request,env}){
 const denied=await checkPrivateAccess(request,env);if(denied)return denied;
 try{
  const manifest=await readManifest(env.SHOREKEEPER_ASSETS_R2);
  if(!manifest)return privateError(404);
  return new Response(JSON.stringify(manifest),{
   status:200,headers:{...PRIVATE_HEADERS,'Content-Type':'application/json; charset=utf-8'}
  });
 }catch{return privateError(503);}
}
