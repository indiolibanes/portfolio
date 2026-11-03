#!/usr/bin/env node
// Run locally: the GLBs never enter GitHub, CI artifacts or public/assets.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const BUCKET='private-assets',ROOT='characters/shorekeeper',CURRENT=ROOT+'/manifests/current.json';
const CANONICAL_SHA='4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30';
function parse(argv){
 const o={init:false,model:null,libraries:[],allow:false,dry:false};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];
  if(a==='--init')o.init=true;
  else if(a==='--model')o.model=argv[++i];
  else if(a==='--library'){
   const v=argv[++i]??'',cut=v.indexOf('='),id=v.slice(0,cut);
   if(cut<=0||!(/^[a-z0-9][a-z0-9_-]{0,39}$/).test(id)||!v.slice(cut+1))throw Error('Use --library id=/caminho/arquivo.glb');
   o.libraries.push({id,file:v.slice(cut+1)});
  }else if(a==='--allow-model-update')o.allow=true;
  else if(a==='--dry-run')o.dry=true;
  else if(a==='--help'||a==='-h'){console.log('Usage: npm run publish:shorekeeper -- --init --model FILE [--library id=FILE] [--dry-run] [--allow-model-update]');process.exit(0);}
  else throw Error('Opção desconhecida: '+a);
 }
 if(!o.model&&!o.libraries.length)throw Error('Forneça --model ou --library.');
 if(o.libraries.length>4||new Set(o.libraries.map(x=>x.id)).size!==o.libraries.length)throw Error('Bibliotecas duplicadas ou acima do limite de 4.');
 if(o.init&&!o.model)throw Error('O primeiro upload exige --model.');
 return o;
}
function wrangler(args,{allowFail=false}={}){
 const run=spawnSync('npx',['--yes','wrangler@latest','r2','object',...args,'--remote'],{encoding:'utf8',maxBuffer:1024*1024});
 if(run.error)throw run.error;
 if(run.status!==0&&!allowFail)throw Error('Wrangler: '+(run.stderr||run.stdout||'erro desconhecido').slice(-1200));
 if(run.status===0)console.log('R2 '+args[0]+' '+args[1]+' OK');
 return run.status===0;
}
async function inspect(file){
 const path=resolve(file??''),data=await readFile(path);
 if(data.byteLength<20||data.byteLength>130000000||data.subarray(0,4).toString()!=='glTF'||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.byteLength)
  throw Error('Arquivo GLB 2.0 inválido: '+path);
 const jsonBytes=data.readUInt32LE(12);
 if(data.readUInt32LE(16)!==0x4e4f534a||jsonBytes<4||20+jsonBytes>data.length||jsonBytes%4!==0)throw Error('Chunk JSON inválido no GLB.');
 let json;try{json=JSON.parse(data.subarray(20,20+jsonBytes).toString('utf8'));}catch{throw Error('Manifesto glTF inválido.');}
 if(json.asset?.version!=='2.0')throw Error('GLB incompatível: asset.version precisa ser 2.0.');
 const hasExternalUri=nodes=>{
  if(!nodes||typeof nodes!=='object')return false;
  return Object.entries(nodes).some(([key,value])=>key==='uri'&&typeof value==='string'&&!/^data:(?:image\/(?:png|jpeg|webp)|application\/(?:octet-stream|gltf-buffer));base64,/i.test(value)||hasExternalUri(value));
 };
 if(hasExternalUri(json))throw Error('GLB com recurso externo; publique apenas GLBs autocontidos.');
 return {path,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.byteLength};
}
function entry(item,kind,id=''){
 const name=(kind==='model'?'shorekeeper-f20a':id)+'-'+item.sha256.slice(0,16)+'.glb';
 const key=ROOT+'/'+(kind==='model'?'models':'animations/combat')+'/'+name;
 return {...(kind==='library'?{id}:{}),key,name,sha256:item.sha256,bytes:item.bytes};
}
async function remoteGet(key,file,allowFail=false){
 return wrangler(['get',BUCKET+'/'+key,'--file',file],{allowFail});
}
async function putVerify(asset,item,temp){
 wrangler(['put',BUCKET+'/'+asset.key,'--file',item.path,'--content-type','model/gltf-binary','--cache-control','private, no-store']);
 const dest=join(temp,'verify-'+asset.sha256.slice(0,16)+'.glb');
 await remoteGet(asset.key,dest);
 const bytes=await readFile(dest),hash=createHash('sha256').update(bytes).digest('hex');
 if(bytes.length!==asset.bytes||hash!==asset.sha256)throw Error('Verificação R2 falhou: '+asset.key);
 await rm(dest,{force:true});
 console.log('SHA-256 remoto verificado: '+asset.name);
}
const temp=await mkdtemp(join(tmpdir(),'shorekeeper-r2-'));
try{
 const flags=parse(process.argv.slice(2));
 const model=flags.model?await inspect(flags.model):null;
 if(model&&model.sha256!==CANONICAL_SHA&&!flags.allow)
  throw Error('GLB não canônico; use --allow-model-update somente após validar a nova versão.');
 if(model&&model.sha256===CANONICAL_SHA&&model.bytes!==39487548)throw Error('Tamanho canônico inconsistente.');
 const libs=[];for(const lib of flags.libraries)libs.push({...lib,source:await inspect(lib.file)});
 console.log('Destino privado: '+BUCKET+'/'+ROOT+'; modelo: '+(model?.sha256??'preservado')+'; bibliotecas: '+libs.length);
 if(!flags.dry){
  const oldFile=join(temp,'old.json'),exists=await remoteGet(CURRENT,oldFile,true);
  if(flags.init&&exists)throw Error('Manifesto já existe: retire --init.');
  if(!flags.init&&!exists)throw Error('Manifesto não acessível. Para a primeira publicação use --init; confira login/bucket.');
  let previous=null;
  if(exists){previous=JSON.parse(await readFile(oldFile,'utf8'));if(previous.schema!=='shorekeeper-private-assets/v1'||!previous.model||!Array.isArray(previous.libraries))throw Error('Manifesto existente incompatível.');}
  const next={schema:'shorekeeper-private-assets/v1',updatedAt:new Date().toISOString(),
   model:model?entry(model,'model'):previous.model,libraries:[...(previous?.libraries??[])]};
  for(const lib of libs){next.libraries=next.libraries.filter(x=>x.id!==lib.id);next.libraries.push(entry(lib.source,'library',lib.id));}
  if(next.libraries.length>4)throw Error('No máximo quatro bibliotecas. Reuse um ID existente para substituir.');
  if(model)await putVerify(next.model,model,temp);
  for(const lib of libs)await putVerify(next.libraries.find(x=>x.id===lib.id),lib.source,temp);
  // Promotion is atomic at the manifest level. Existing immutable model objects stay intact.
  const newFile=join(temp,'new.json');await writeFile(newFile,JSON.stringify(next,null,2)+'\n');
  wrangler(['put',BUCKET+'/'+CURRENT,'--file',newFile,'--content-type','application/json','--cache-control','private, no-store']);
  const check=join(temp,'check.json');await remoteGet(CURRENT,check);
  if(JSON.stringify(JSON.parse(await readFile(check,'utf8')))!==JSON.stringify(next))throw Error('Manifesto remoto difere do publicado.');
  console.log('Publicação privada concluída. O Pages lê a versão atual sem novo deploy.');
 }else console.log('DRY RUN: nenhuma alteração no R2.');
}catch(error){console.error('Publicação não concluída: '+error.message);process.exitCode=1;}
finally{await rm(temp,{recursive:true,force:true});}
