// Same-origin streaming of a single vetted model from a dedicated, private R2 bucket.
// Opt-in: set SHOREKEEPER_MODEL_PUBLIC=true and bind SHOREKEEPER_ASSETS_R2.
// Never bind the user's personal/private storage bucket.
export const SHOREKEEPER_MODEL_KEY='models/shorekeeper/shorekeeper-f20a-original-idles.glb';
export const SHOREKEEPER_MODEL_SIZE=39487548;
export const SHOREKEEPER_MODEL_SHA256='4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30';

const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function objectAvailable(env){
 return env?.SHOREKEEPER_MODEL_PUBLIC==='true'&&env?.SHOREKEEPER_ASSETS_R2;
}
function headers(object){
 const h=new Headers({
  'Content-Type':'model/gltf-binary',
  'Content-Length':String(object.size),
  'Content-Disposition':'inline; filename="shorekeeper-f20a-original-idles.glb"',
  'Cache-Control':'public, max-age=3600',
  'X-Content-Type-Options':'nosniff',
  'X-Asset-SHA256':SHOREKEEPER_MODEL_SHA256
 });
 if(object.httpEtag)h.set('ETag',object.httpEtag);
 return h;
}
function unavailable(){
 return new Response(null,{status:404,headers:noStore});
}
function invalidObject(){
 return new Response('Model asset does not match the approved manifest.',{status:409,headers:noStore});
}
export async function onRequestHead({env}){
 if(!objectAvailable(env))return unavailable();
 try{
  const obj=await env.SHOREKEEPER_ASSETS_R2.head(SHOREKEEPER_MODEL_KEY);
  if(!obj)return unavailable();
  if(obj.size!==SHOREKEEPER_MODEL_SIZE)return invalidObject();
  return new Response(null,{status:200,headers:headers(obj)});
 }catch{return new Response(null,{status:503,headers:noStore});}
}
export async function onRequestGet({env}){
 if(!objectAvailable(env))return unavailable();
 try{
  const obj=await env.SHOREKEEPER_ASSETS_R2.get(SHOREKEEPER_MODEL_KEY);
  if(!obj)return unavailable();
  if(obj.size!==SHOREKEEPER_MODEL_SIZE)return invalidObject();
  return new Response(obj.body,{status:200,headers:headers(obj)});
 }catch{return new Response(null,{status:503,headers:noStore});}
}
