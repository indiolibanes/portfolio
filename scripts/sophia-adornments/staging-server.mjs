/** Local-only review. Nothing in this folder is an Astro/public route. */
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath}from'node:url';
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url))),here=path.dirname(fileURLToPath(import.meta.url));
const files={'/':path.join(here,'staging.html'),'/staging.mjs':path.join(here,'staging.mjs'),'/model/source.glb':path.join(root,'public/experimental/sophia-alpha.glb'),'/model/pilot.glb':path.join(root,'local-private/adornments-r1/sophia-6h-adornments-pilot.glb')};
const vendor=await fs.realpath(path.join(root,'node_modules/three'));
const server=http.createServer(async(req,res)=>{
 try{
  const port=server.address()?.port,hosts=new Set(['localhost:'+port,'127.0.0.1:'+port]);
  if(!hosts.has(req.headers.host)){res.writeHead(403);res.end('Local review only');return}
  const url=new URL(req.url,'http://localhost');let file=files[url.pathname];
  if(!file&&url.pathname.startsWith('/vendor/three/')){const candidate=await fs.realpath(path.join(vendor,decodeURIComponent(url.pathname.slice('/vendor/three/'.length))));if(!candidate.startsWith(vendor+path.sep))throw Error('Denied');file=candidate}
  if(!file){res.writeHead(404);res.end('Not found');return}
  const b=await fs.readFile(file),ext=path.extname(file);res.writeHead(200,{'Content-Type':ext==='.html'?'text/html; charset=utf-8':ext==='.glb'?'model/gltf-binary':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' blob: data:; worker-src 'none'"});res.end(b)
 }catch{res.writeHead(404);res.end('Not found')}
});
server.listen(Number(process.env.SOPHIA_REVIEW_PORT||4877),'127.0.0.1',()=>console.log('Local Sophia review: http://127.0.0.1:'+server.address().port));
