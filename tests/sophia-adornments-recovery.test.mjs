import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs/promises';import os from'node:os';import path from'node:path';import{spawnSync,spawn}from'node:child_process';import http from'node:http';
test('real 6H recovery preserves surfaces, animation and attachments; foreign input is rejected',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sophia-recovery-'));try{
  const source='public/experimental/sophia-alpha.glb',pilot=path.join(temp,'pilot.glb'),sockets=path.join(temp,'sockets.json');let p=spawnSync('python3',['scripts/sophia-adornments/build_pilot.py','--source',source,'--out',pilot,'--sockets',sockets],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);
  p=spawnSync(process.execPath,['--expose-gc','scripts/sophia-adornments/verify-pilot.mjs',source,pilot,path.join(temp,'equivalence.json')],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);const r=JSON.parse(await fs.readFile(path.join(temp,'equivalence.json'),'utf8'));assert.equal(r.maxSocketMatrixError,0);assert.ok(r.maxStarVertexError<1e-6);assert.equal(r.cycles.length,10);
  const wrong=Buffer.from(await fs.readFile(source));wrong[wrong.length-8]^=1;const foreign=path.join(temp,'foreign.glb');await fs.writeFile(foreign,wrong);p=spawnSync('python3',['scripts/sophia-adornments/build_pilot.py','--source',foreign,'--out',path.join(temp,'must-not-exist.glb'),'--sockets',path.join(temp,'bad.json')],{encoding:'utf8'});assert.notEqual(p.status,0);assert.match(p.stderr,/Source SHA/);await assert.rejects(fs.stat(path.join(temp,'must-not-exist.glb')));
 }finally{await fs.rm(temp,{recursive:true,force:true})}
});
test('local review denies foreign Host and arbitrary filesystem paths',async()=>{
 const child=spawn(process.execPath,['scripts/sophia-adornments/staging-server.mjs'],{env:{...process.env,SOPHIA_REVIEW_PORT:'0'},stdio:['ignore','pipe','pipe']});
 try{
  const port=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Review server not ready')),5000);child.stdout.on('data',b=>{const m=b.toString().match(/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timeout);resolve(Number(m[1]))}});child.on('error',reject)});
  const get=(route,host)=>new Promise((resolve,reject)=>{const req=http.get({host:'127.0.0.1',port,path:route,headers:{Host:host||'127.0.0.1:'+port}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject)});
  assert.equal(await get('/'),200);assert.equal(await get('/','evil.invalid:'+port),403);assert.equal(await get('/package.json'),404);assert.equal(await get('/vendor/three/%2e%2e/%2e%2e/package.json'),404);
 }finally{child.kill('SIGTERM')}
});
