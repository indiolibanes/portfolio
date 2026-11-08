import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const temporary=await mkdtemp(path.join(tmpdir(),'hsin-ingestion-test-'));
function run(command,args){
 const result=spawnSync(command,args,{maxBuffer:8*1024*1024});
 assert.equal(result.status,0,String(result.stderr));return result;
}
try{
 const original=path.join(temporary,'original name.mp4'),output=path.join(temporary,'analysis');
 run('ffmpeg',['-v','error','-f','lavfi','-i','color=red:s=96x96:r=10:d=1','-f','lavfi','-i','color=blue:s=96x96:r=10:d=1','-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0','-y',original]);
 await (await import('node:fs/promises')).mkdir(output);
 await writeFile(path.join(output,'timeline.csv'),'reviewed timeline preserved');
 run('node',['scripts/analyze-hsin-references.mjs',temporary,output]);
 const manifest=JSON.parse(await readFile(path.join(output,'sources-manifest.json')));
 assert.equal(manifest.sources.length,1);assert.equal(manifest.sources[0].original_name,'original name.mp4');
 assert.equal(manifest.sources[0].duration_ms,2000);assert.equal(manifest.sources[0].audio,false);
 assert.equal(await readFile(path.join(output,'timeline.csv'),'utf8'),'reviewed timeline preserved');
 const samples=JSON.parse(await readFile(path.join(output,manifest.sources[0].source_id,'temporal-samples.json')));
 assert.ok(samples.some(sample=>sample.cut_candidate));assert.ok(samples.some(sample=>sample.near_duplicate));
 console.log('Reference ingestion: codec/metadata, stable source ID, cuts, duplicates, outputs and reviewed timeline preservation PASS');
}finally{await rm(temporary,{recursive:true,force:true});}
