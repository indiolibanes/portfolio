import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs/promises';import os from'node:os';import path from'node:path';import{spawnSync,spawn}from'node:child_process';import http from'node:http';import{createHash}from'node:crypto';
test('real-source collar repair preserves clips/rig/props, refuses foreign pilot, and stays loopback-only',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sophia-r1c-')),baseline=path.join(dir,'baseline.glb'),candidate=path.join(dir,'candidate.glb');let child;
 const run=(exe,args)=>{const r=spawnSync(exe,args,{encoding:'utf8'});assert.equal(r.status,0,r.stderr+'\n'+r.stdout);return r};
 try{
  run('python3',['scripts/sophia-adornments/build_pilot.py','--out',baseline,'--sockets',path.join(dir,'sockets.json')]);
  run('python3',['scripts/sophia-adornments/repair_r1c.py','--source',baseline,'--out',candidate]);
  assert.equal(createHash('sha256').update(await fs.readFile(candidate)).digest('hex'),'ce3386a08ce6624fb09cb34a7d9a9028f65f2d7d83033c552c4119363eb62666');
  run('python3',['scripts/sophia-adornments/verify_r1c.py','--baseline',baseline,'--candidate',candidate,'--out',path.join(dir,'diff.json')]);
  run(process.execPath,['--expose-gc','scripts/sophia-adornments/verify-r1c-runtime.mjs',baseline,candidate,path.join(dir,'cpu.json')]);
  const wrong=Buffer.from(await fs.readFile(baseline));wrong[wrong.length-8]^=1;await fs.writeFile(path.join(dir,'foreign.glb'),wrong);const rejected=spawnSync('python3',['scripts/sophia-adornments/repair_r1c.py','--source',path.join(dir,'foreign.glb'),'--out',path.join(dir,'bad.glb')],{encoding:'utf8'});assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/R1.B source SHA mismatch/);await assert.rejects(fs.stat(path.join(dir,'bad.glb')));
  child=spawn(process.execPath,['scripts/sophia-adornments/r1c-staging-server.mjs'],{env:{...process.env,SOPHIA_REVIEW_PORT:'0',SOPHIA_R1C_BASELINE:baseline,SOPHIA_R1C_CANDIDATE:candidate},stdio:['ignore','pipe','pipe']});
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Local server timeout')),5000);child.stdout.on('data',b=>{const m=b.toString().match(/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve(+m[1])}});child.once('error',reject)});
  const get=(route,host)=>new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path:route,headers:{Host:host||'127.0.0.1:'+port}},res=>{const parts=[];res.on('data',b=>parts.push(b));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(parts)}))}).on('error',reject)});
  assert.equal((await get('/')).status,200);assert.equal((await get('/','evil.invalid:'+port)).status,403);assert.equal((await get('/package.json')).status,404);assert.equal((await get('/vendor/three/%2e%2e/%2e%2e/package.json')).status,404);assert.equal((await get('/vendor/three/build/three.module.js')).status,200);assert.equal(createHash('sha256').update((await get('/model/pilot.glb')).body).digest('hex'),'ce3386a08ce6624fb09cb34a7d9a9028f65f2d7d83033c552c4119363eb62666');
 }finally{child?.kill();await fs.rm(dir,{recursive:true,force:true})}
});
