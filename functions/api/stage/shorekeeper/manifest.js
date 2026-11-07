import {releaseEnabled,currentRelease,publicReleaseManifest,releaseError,RELEASE_BASE_HEADERS} from '../../../_lib/shorekeeper-public.mjs';
export async function onRequestGet({env}){
 if(!releaseEnabled(env))return releaseError(404);
 try{
  const manifest=await currentRelease(env);
  if(!manifest)return releaseError(404);
  return new Response(JSON.stringify(publicReleaseManifest(manifest)),{
   status:200,headers:{
    ...RELEASE_BASE_HEADERS,
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store'
   }
  });
 }catch{return releaseError(503);}
}

export async function onRequestHead(context){const r=await onRequestGet(context);return new Response(null,{status:r.status,headers:r.headers});}
