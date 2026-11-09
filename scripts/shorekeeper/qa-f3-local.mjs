/** Local-only GPU/SwiftShader component recorder. No private bytes in repository/output by default.
 * node scripts/shorekeeper/qa-f3-local.mjs PRIVATE_CLIP_DIR PRIVATE_OUTPUT_DIR [port]
 * Open localhost and use the record buttons. Source skeleton != canonical skinned-model validation.
 */
import {createServer} from 'vite';import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const repo=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'../..')),clips=await realpath(process.argv[2]),requestedOut=resolve(process.argv[3]),port=Number(process.argv[4]??4343),baseline=await realpath(process.argv[5]??resolve(repo,'../portfolio-f3-base'));
if(execFileSync('git',['-C',baseline,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!=='bbc7774e94940ff9307831810f6b0eee76d15201')throw Error('QA baseline must be exact F2');
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Private output directory and local port required');await mkdir(requestedOut,{recursive:true});const out=await realpath(requestedOut);if(out===repo||out.startsWith(repo+'/')||out===baseline||out.startsWith(baseline+'/'))throw Error('Private output MUST be outside repository and baseline, including public/dist and symlinks');
const expected={basic:'2efd607ea7d47f9d43c67eb1e0da7bb08445acb63eed60b66296966bb6fd318e',advanced:'dfb8086c4c41cdc65a71ca5a9e8465e77f23cd2e50223cb5e79522d32363306a',burst:'984f7b58ae5b32560509834d75793fd298e51b49a2a062a4a7a7fba85b6fc35e'};
for(const [id,sha]of Object.entries(expected)){const b=await readFile(resolve(clips,id+'.glb'));if(createHash('sha256').update(b).digest('hex')!==sha)throw Error('Private source hash mismatch: '+id);}
const page=await readFile(resolve(repo,'scripts/shorekeeper/qa-f3-viewer.html'),'utf8');
const server=await createServer({root:repo,configFile:false,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port,strictPort:true,fs:{allow:[repo,baseline]},cors:false},plugins:[{name:'f3-local-private',configureServer(v){v.middlewares.use(async(req,res,next)=>{try{
 const u=new URL(req.url,'http://localhost');if(req.method==='POST'&&req.headers.origin!=='http://127.0.0.1:'+port){res.statusCode=403;res.end('Local origin required');return;}
 if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(await v.transformIndexHtml('/',page.replace('__BASE__',baseline)));return;}
 if(u.pathname.startsWith('/private-clips/')){const id=u.pathname.slice('/private-clips/'.length).replace(/\.glb$/,'');if(!Object.hasOwn(expected,id)){res.statusCode=404;res.end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','model/gltf-binary');res.end(await readFile(resolve(clips,id+'.glb')));return;}
 if(u.pathname==='/qa-frame'&&req.method==='POST'){const key=u.searchParams.get('key');if(!/^(?:F2|F3fixed|F3cinematic|rest)-(?:desktop|mobile)-\d{4}\.png$/.test(key??'')){res.statusCode=400;res.end();return;}const data=[];let n=0;for await(const b of req){n+=b.length;if(n>8_000_000)throw Error('Frame too large');data.push(b);}await writeFile(resolve(out,key),Buffer.concat(data));res.end('saved');return;}
 if(u.pathname==='/qa-result'&&req.method==='POST'){const data=[];let n=0;for await(const b of req){n+=b.length;if(n>1_000_000)throw Error('Report too large');data.push(b);}const j=JSON.parse(Buffer.concat(data)),name=String(j.mode)+'-'+String(j.viewport);if(!/^(F2|F3fixed|F3cinematic|rest)-(desktop|mobile)$/.test(name))throw Error('Invalid report');await writeFile(resolve(out,name+'.json'),JSON.stringify(j,null,2));res.end('saved');return;}
 next();
 }catch(e){res.statusCode=500;res.end(String(e.message));}});}}]});
await server.listen();console.log('Private local component QA: http://127.0.0.1:'+port+' (not exposed publicly)');
