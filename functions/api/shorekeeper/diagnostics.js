/**
 * Authenticated, read-only R2 integrity check.
 *
 * Exposes only coarse status and known library IDs, never object keys, token,
 * email, bucket name, account ID or raw private bytes.
 * Missing environment variables fail closed.
 */
import {readManifest,verifyAccessJwt,PRIVATE_HEADERS} from '../../_lib/shorekeeper-private.mjs';
const jsonHeaders={...PRIVATE_HEADERS,'Content-Type':'application/json; charset=utf-8'};
const send=(state,status=200,details={})=>new Response(JSON.stringify({state,...details}),{status,headers:jsonHeaders});
function requestJwt(request){
 const header=request.headers.get('Cf-Access-Jwt-Assertion');
 if(header)return header;
 const cookie=request.headers.get('Cookie')??'';
 return /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(cookie)?.[1]??null;
}
const entryState=(obj,bytes)=>!obj?'missing':obj.size===bytes?'present':'size_mismatch';

/** Unit-testable status inspector; keys never appear in the returned structure. */
export async function inspectShorekeeperR2(bucket){
 const manifest=await readManifest(bucket);
 if(!manifest)return {state:'manifest_missing',model:'not_checked',libraries:[],allPresent:false};
 const model=await bucket.head(manifest.model.key);
 const libraries=[];
 for(const entry of manifest.libraries){
  const object=await bucket.head(entry.key);
  libraries.push({id:entry.id,state:entryState(object,entry.bytes)});
 }
 const modelState=entryState(model,manifest.model.bytes);
 const allPresent=modelState==='present'&&libraries.every(x=>x.state==='present');
 return {state:allPresent?'all_objects_present':'objects_missing_or_mismatched',
  model:modelState,libraries,allPresent};
}
export async function onRequestGet({request,env}){
 if(!env?.SK_ACCESS_TEAM_DOMAIN||!env?.SK_ACCESS_AUD)
  return send('private_access_config_unavailable',503);
 if(!await verifyAccessJwt(requestJwt(request),env.SK_ACCESS_TEAM_DOMAIN,env.SK_ACCESS_AUD))
  return send('access_denied',403);
 if(!env.SHOREKEEPER_ASSETS_R2)
  return send('pages_r2_binding_missing',503);
 try{
  return send('verified',200,{inspection:await inspectShorekeeperR2(env.SHOREKEEPER_ASSETS_R2)});
 }catch{
  return send('manifest_invalid_or_r2_error',503);
 }
}
