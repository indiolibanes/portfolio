// Private R2 access, fail-closed. No personal model/secret is bundled with the site.
export const MANIFEST_KEY='characters/shorekeeper/manifests/current.json';
export const MANIFEST_SCHEMA='shorekeeper-private-assets/v1';
export const PRIVATE_HEADERS=Object.freeze({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
const MAX_MANIFEST=65536,MAX_OBJECT=130000000;
const cache=new Map();
const hex=/^[0-9a-f]{64}$/;
function validKey(key,kind){
 const regex=kind==='model'
  ?/^characters\/shorekeeper\/models\/[a-z0-9][a-z0-9._-]*\.glb$/
  :/^characters\/shorekeeper\/animations\/(?:combat|idles|misc)\/[a-z0-9][a-z0-9._-]*\.glb$/;
 return typeof key==='string'&&regex.test(key)&&!key.includes('..');
}
export function validAsset(entry,kind){
 return !!entry&&typeof entry==='object'&&validKey(entry.key,kind)&&
  typeof entry.sha256==='string'&&hex.test(entry.sha256)&&
  Number.isSafeInteger(entry.bytes)&&entry.bytes>16&&entry.bytes<=MAX_OBJECT&&
  typeof entry.name==='string'&&/^[a-z0-9][a-z0-9._-]*\.glb$/.test(entry.name)&&
  (kind==='model'||(typeof entry.id==='string'&&/^[a-z0-9][a-z0-9_-]{0,39}$/.test(entry.id)));
}
export function validateManifest(m){
 if(!m||m.schema!==MANIFEST_SCHEMA||!validAsset(m.model,'model')||!Array.isArray(m.libraries)||m.libraries.length>4)throw Error('Manifesto privado inválido.');
 const ids=new Set();
 for(const lib of m.libraries){
  if(!validAsset(lib,'library')||ids.has(lib.id))throw Error('Biblioteca privada inválida.');
  ids.add(lib.id);
 }
 return m;
}
export async function readManifest(bucket){
 const obj=await bucket.get(MANIFEST_KEY);
 if(!obj)return null;
 if(obj.size<=0||obj.size>MAX_MANIFEST)throw Error('Manifesto fora dos limites.');
 return validateManifest(JSON.parse(await obj.text()));
}
function decode(part){
 if(typeof part!=='string'||part.length>16384||!/^[a-zA-Z0-9_-]+$/.test(part))throw Error('JWT inválido');
 const encoded=part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4);
 return Uint8Array.from(atob(encoded),v=>v.charCodeAt(0));
}
function parseJson(bytes){return JSON.parse(new TextDecoder().decode(bytes));}
/** Normalize a trusted Cloudflare Access issuer, never arbitrary origins. */
export function normalizeAccessTeamDomain(value){
 if(typeof value!=='string')return null;
 let text=value.trim();
 if((text.startsWith('"')&&text.endsWith('"'))||
    (text.startsWith("'")&&text.endsWith("'")))text=text.slice(1,-1).trim();
 if(/^[a-z0-9-]+\.cloudflareaccess\.com\/*$/i.test(text))text='https://'+text;
 try{
  const url=new URL(text);
  if(url.protocol!=='https:'||url.port||url.username||url.password||
     url.search||url.hash||url.pathname!=='/'||
     !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(url.hostname))return null;
  return url.origin;
 }catch{return null;}
}
export async function verifyAccessJwt(token,domain,audience,fetcher=fetch){
 const issuer=normalizeAccessTeamDomain(domain);
 if(typeof token!=='string'||token.length>16000||!issuer||
    !/^[a-zA-Z0-9_-]{16,128}$/.test(audience??''))return false;
 try{
  const parts=token.split('.');if(parts.length!==3)return false;
  const header=parseJson(decode(parts[0])),payload=parseJson(decode(parts[1]));
  if(header.alg!=='RS256'||typeof header.kid!=='string')return false;
  const now=Math.floor(Date.now()/1000);
  if(payload.iss!==issuer||!(Array.isArray(payload.aud)?payload.aud.includes(audience):payload.aud===audience)||
    !Number.isSafeInteger(payload.exp)||payload.exp<=now||
    (typeof payload.nbf==='number'&&payload.nbf>now)||
    (typeof payload.iat==='number'&&payload.iat>now+60))return false;
  let list=cache.get(issuer);
  if(!list||list.until<Date.now()){
   const response=await fetcher(issuer+'/cdn-cgi/access/certs',{redirect:'error'});
   if(!response.ok)return false;
   const data=await response.json();
   if(!Array.isArray(data.keys)||data.keys.length>12)return false;
   list={until:Date.now()+300000,keys:data.keys};cache.set(issuer,list);
  }
  const jwk=list.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.n&&k.e);
  if(!jwk)return false;
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signed=new TextEncoder().encode(parts[0]+'.'+parts[1]);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),signed);
 }catch{return false;}
}
export async function checkPrivateAccess(request,env){
 if(!env?.SHOREKEEPER_ASSETS_R2||!env?.SK_ACCESS_TEAM_DOMAIN||!env?.SK_ACCESS_AUD)
  return new Response('Private storage unavailable.',{status:503,headers:PRIVATE_HEADERS});
 let token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token){
  const match=/(?:^|;\s*)CF_Authorization=([^;]+)/.exec(request.headers.get('Cookie')??'');
  if(match)token=match[1];
 }
 if(!await verifyAccessJwt(token,env.SK_ACCESS_TEAM_DOMAIN,env.SK_ACCESS_AUD))
  return new Response('Private authorization required.',{status:403,headers:PRIVATE_HEADERS});
 return null;
}
export function privateError(status=503){
 return new Response(null,{status,headers:PRIVATE_HEADERS});
}
