import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {diagnoseAccessSigningKey,verifyAccessJwt} from '../functions/_lib/shorekeeper-private.mjs';

const domain='https://diagnostic-test.cloudflareaccess.com',aud='f'.repeat(32);
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),alg:'RS256',kid:'reference-key',use:'sig'};
const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
function jwt({signature='valid',kid='reference-key'}={}){
 const now=Math.floor(Date.now()/1000);
 const input=encode({alg:'RS256',kid})+'.'+encode({iss:domain,aud:[aud],iat:now-10,exp:now+600});
 const cryptographic=sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');
 return input+'.'+(signature==='valid'?cryptographic:Buffer.alloc(256,1).toString('base64url'));
}
const asKeys=keys=>async()=>new Response(JSON.stringify({keys}),{status:200});
test('normalized Cloudflare JWK verifies a truly signed JWT',async()=>{
 assert.equal(await verifyAccessJwt(jwt(),domain,aud,asKeys([jwk])),true);
 assert.equal(await diagnoseAccessSigningKey(jwt(),domain,aud,asKeys([jwk])),'signature_valid_but_primary_check_failed');
});
test('JWT with malformed signature never becomes authorized',async()=>{
 const forged=jwt({signature:'invalid'});
 assert.equal(await verifyAccessJwt(forged,domain,aud,asKeys([jwk])),false);
 assert.equal(await diagnoseAccessSigningKey(forged,domain,aud,asKeys([jwk])),'signature_invalid');
});
test('certificate endpoint errors are distinct from unknown KID and malformed JWKS',async()=>{
 assert.equal(await diagnoseAccessSigningKey(jwt(),domain,aud,async()=>{throw Error('DNS failure');}),'certificates_fetch_failed');
 assert.equal(await diagnoseAccessSigningKey(jwt(),domain,aud,async()=>new Response(null,{status:503})),'certificates_endpoint_unavailable');
 assert.equal(await diagnoseAccessSigningKey(jwt(),domain,aud,asKeys([])),'certificates_response_invalid');
 assert.equal(await diagnoseAccessSigningKey(jwt(),domain,aud,asKeys([{...jwk,kid:'rotated-key'}])),'signing_key_not_found');
});
test('bad key material is diagnosed but cannot authorize',async()=>{
 assert.equal(await diagnoseAccessSigningKey(jwt(),domain,aud,asKeys([{...jwk,kty:'EC'}])),'signing_key_invalid');
 assert.equal(await diagnoseAccessSigningKey(jwt(),domain,aud,asKeys([{...jwk,n:'not-a-valid-rsa-modulus'}])),'public_key_import_failed');
});
test('diagnostic result never exposes token, key, issuer, claims or AUD',async()=>{
 const input=jwt();
 const result=await diagnoseAccessSigningKey(input,domain,aud,asKeys([]));
 assert.equal(typeof result,'string');
 for(const sensitive of [input,jwk.n,domain,aud])assert.ok(!result.includes(sensitive));
});
