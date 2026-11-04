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
/**
 * A diagnostic HINT only, never an authorization decision.
 * It inspects untrusted JWT claims only AFTER signature verification failed.
 * The actual Access gate stays verifyAccessJwt() and always rejects on failure.
 * Do not return the token, claims, expected audience, issuer or any secrets.
 */
function rejectedJwtReason(token,domain,audience){
 if(!token)return 'token_missing';
 if(typeof domain!=='string'||!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)||
    typeof audience!=='string'||!/^[a-zA-Z0-9_-]{16,128}$/.test(audience))
  return 'access_configuration_invalid';
 try{
  if(typeof token!=='string'||token.length>16000)return 'token_unreadable';
  const parts=token.split('.');if(parts.length!==3)return 'token_unreadable';
  const b64=parts[1].replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-parts[1].length%4)%4);
  const claims=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64),x=>x.charCodeAt(0))));
  const auds=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(claims.iss!==domain)return 'issuer_mismatch';
  if(!auds.includes(audience))return 'audience_mismatch';
  const now=Math.floor(Date.now()/1000);
  if(!Number.isSafeInteger(claims.exp)||claims.exp<=now)return 'token_expired';
  if(Number.isFinite(claims.nbf)&&claims.nbf>now)return 'token_not_yet_valid';
  return 'signature_or_public_key_failed';
 }catch{return 'token_unreadable';}
}

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
 const jwt=requestJwt(request);
 if(!await verifyAccessJwt(jwt,env.SK_ACCESS_TEAM_DOMAIN,env.SK_ACCESS_AUD))
  return send('access_denied',403,{reason:rejectedJwtReason(jwt,env.SK_ACCESS_TEAM_DOMAIN,env.SK_ACCESS_AUD)});
 if(!env.SHOREKEEPER_ASSETS_R2)
  return send('pages_r2_binding_missing',503);
 try{
  return send('verified',200,{inspection:await inspectShorekeeperR2(env.SHOREKEEPER_ASSETS_R2)});
 }catch{
  return send('manifest_invalid_or_r2_error',503);
 }
}
