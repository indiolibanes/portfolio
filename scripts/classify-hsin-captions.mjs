/** Optional OCR caption pass; original files remain untouched. Requires tesseract. */
import {mkdtemp,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const [filename,sourceId,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/classify-hsin-captions.mjs VIDEO SOURCE_ID OUTPUT_JSON');
const temporary=await mkdtemp(path.join(tmpdir(),'hsin-caption-'));
function run(command,args){
 const r=spawnSync(command,args,{maxBuffer:8*1024*1024});
 if(r.status!==0)throw Error(String(r.stderr));
 return r.stdout.toString();
}
try{
 run('ffmpeg',['-v','error','-i',filename,'-vf','fps=1,crop=iw*.38:ih*.12:0:ih*.88,scale=760:-1','-y',path.join(temporary,'%03d.png')]);
 const samples=[];
 for(const frame of (await readdir(temporary)).sort()){
  const text=run('tesseract',[path.join(temporary,frame),'stdout','--psm','6']);
  const normalized=text.toUpperCase().replace(/[^A-Z]/g,'');
  const rules=[['RESONANCE_LIBERATION',/LIBERA/],['RESONANCE_SKILL',/SKILL/],['FORTE_CIRCUIT',/FORTE|CIRCU/],['INTRO',/INTRO/],['OUTRO',/OUTRO|QUTRO/],['BASIC',/BASI|ATTACK/]];
  const caption=rules.find(([,pattern])=>pattern.test(normalized))?.[0]??'UNRESOLVED';
  // Intro/outro labels override the generic SKILL label.
  const candidate=/INTRO/.test(normalized)?'INTRO':/OUTRO|QUTRO/.test(normalized)?'OUTRO':caption;
  samples.push({source_id:sourceId,timestamp_ms:(Number(path.parse(frame).name)-1)*1000,text:text.trim(),caption_candidate:candidate});
 }
 await writeFile(output,JSON.stringify({sample_rate_hz:1,uncertainty_ms:1000,samples,caveat:'OCR reads editorial labels. It does not infer body motion, form, continuous playback or canonical timing.'},null,2));
}finally{await rm(temporary,{recursive:true,force:true});}
