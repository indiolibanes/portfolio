/** Private loopback R1.C comparator. Reuses the audited R1.B UI, no Astro route. */
import http from'node:http';import fs from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),vendor=await fs.realpath(path.join(root,'node_modules/three'));
const hashes={source:'fd278e201f1854dd1a2dae6f24064a0c2f9013262007cece70ff478c28ff1fce',pilot:'ce3386a08ce6624fb09cb34a7d9a9028f65f2d7d83033c552c4119363eb62666'};
const models={source:await fs.readFile(process.env.SOPHIA_R1C_BASELINE||path.join(root,'local-private/adornments-r1c/r1b-baseline.glb')),pilot:await fs.readFile(process.env.SOPHIA_R1C_CANDIDATE||path.join(root,'local-private/adornments-r1c/sophia-r1c-collar-study.glb'))};
for(const k of Object.keys(models))if(createHash('sha256').update(models[k]).digest('hex')!==hashes[k])throw Error('Private '+k+' SHA mismatch');
let html=await fs.readFile(path.join(here,'staging.html'),'utf8');html=html.replace('Sophia · adornos recuperados','Sophia R1.C · estudo experimental da gola').replace('Carregar piloto','Ver derivado R1.C').replace('Ver fonte 6H','Ver piloto R1.B').replace('Contatos do jaleco e conformidade C1 permanecem pendentes','IDENTITY_BLOCKED: sem nova marca ou franja. Contatos do jaleco permanecem pendentes');
let client=await fs.readFile(path.join(here,'staging.mjs'),'utf8');client=client.replace('3b0e7db84809d6e4fe6eaa2bc6299874c202c529adcbd369cf83c6a29d3c3a2a',hashes.source).replace("pilot:'fd278e201f1854dd1a2dae6f24064a0c2f9013262007cece70ff478c28ff1fce'","pilot:'"+hashes.pilot+"'");
// Both sides already have the rigid recovered group. The original 6H primitive
// visibility fallback must not hide unrelated R1.B body primitives.
client=client.replace("if(kind==='source'){","if(false){");
const server=http.createServer(async(req,res)=>{try{
 const port=server.address().port;if(!new Set(['127.0.0.1:'+port,'localhost:'+port]).has(req.headers.host)){res.writeHead(403);res.end('Local review only');return}
 const u=new URL(req.url,'http://localhost');let bytes,type;
 if(u.pathname==='/'){bytes=html;type='text/html; charset=utf-8'}else if(u.pathname==='/staging.mjs'){bytes=client;type='text/javascript'}else if(u.pathname==='/model/source.glb'||u.pathname==='/model/pilot.glb'){bytes=models[u.pathname.includes('source')?'source':'pilot'];type='model/gltf-binary'}else if(u.pathname.startsWith('/vendor/three/')){const p=await fs.realpath(path.join(vendor,decodeURIComponent(u.pathname.slice(14))));if(!p.startsWith(vendor+path.sep))throw Error('Denied');bytes=await fs.readFile(p);type='text/javascript'}else throw Error('Not found');
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' blob: data:; worker-src 'none'"});res.end(bytes)
 }catch{res.writeHead(404);res.end('Not found')}});
server.listen(Number(process.env.SOPHIA_REVIEW_PORT||4878),'127.0.0.1',()=>console.log('Local R1.C review: http://127.0.0.1:'+server.address().port));
