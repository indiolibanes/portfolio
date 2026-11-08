/** Local audiovisual inventory. Requires ffmpeg/ffprobe. Originals are read-only.
 * Usage: node scripts/analyze-hsin-references.mjs INPUT_DIRECTORY OUTPUT_DIRECTORY
 * OUTPUT contains derived images. Review before publishing.
 */
import {readdir,readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {rmSync} from 'node:fs';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Supply input and output directories');
await mkdir(output,{recursive:true});
function run(command,args,options={}){
 const result=spawnSync(command,args,{maxBuffer:128*1024*1024,...options});
 if(result.status!==0)throw Error(command+': '+String(result.stderr).slice(-1000));
 return result.stdout;
}
async function walk(folder){
 const files=[];
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const filename=path.join(folder,entry.name);
  if(entry.isDirectory()&&path.resolve(filename)!==path.resolve(output))files.push(...await walk(filename));
  else if(/\.(mp4|mov|webm|mkv|gif|avi|m4v|png|jpg|jpeg|webp)$/i.test(entry.name))files.push(filename);
 }
 return files.sort();
}
async function hashFile(filename){
 const hash=createHash('sha256');
 for await(const chunk of createReadStream(filename))hash.update(chunk);
 return hash.digest('hex');
}
let inputDirectory=input;
if((await stat(input)).isFile()){
 if(!/\.zip$/i.test(input))throw Error('Expected a directory or ZIP archive');
 inputDirectory=await mkdtemp(path.join(tmpdir(),'hsin-reference-'));
 process.on('exit',()=>rmSync(inputDirectory,{recursive:true,force:true}));
 run('python3',['-c',`import pathlib,zipfile,sys,shutil
root=pathlib.Path(sys.argv[2]).resolve()
with zipfile.ZipFile(sys.argv[1]) as z:
 for item in z.infolist():
  target=(root/item.filename).resolve()
  if not target.is_relative_to(root):raise ValueError('Unsafe archive path')
  if item.is_dir():target.mkdir(parents=True,exist_ok=True)
  else:
   target.parent.mkdir(parents=True,exist_ok=True)
   with z.open(item) as source,target.open('wb') as dest:shutil.copyfileobj(source,dest)
`,input,inputDirectory]);
}
const sources=[],metadata=[],timeline=[],palette={};
for(const filename of await walk(inputDirectory)){
 const hash=await hashFile(filename),id='hsin-'+hash.slice(0,12);
 const probe=JSON.parse(run('ffprobe',['-v','error','-show_format','-show_streams','-of','json',filename]));
 const video=probe.streams.find(stream=>stream.codec_type==='video');
 if(!video)continue;
 const still=/\.(png|jpe?g|webp)$/i.test(filename);
 const duration=still?0:Number(probe.format.duration??video.duration);
 if(!still&&!Number.isFinite(duration))throw Error('Duration unavailable for '+filename);
 const folder=path.join(output,id);await mkdir(folder,{recursive:true});
 const source={source_id:id,original_name:path.relative(inputDirectory,filename),sha256:hash,bytes:(await stat(filename)).size,origin:'user supplied archive',format:probe.format.format_name,codec:video.codec_name,width:video.width,height:video.height,duration_ms:still?null:Math.round(duration*1000),declared_frame_count:video.nb_frames??null,kind:still?'still':'moving_image',avg_frame_rate:video.avg_frame_rate,r_frame_rate:video.r_frame_rate,time_base:video.time_base,audio:probe.streams.some(s=>s.codec_type==='audio'),possible_vfr:video.avg_frame_rate!==video.r_frame_rate,gif_timing_caveat:/\.gif$/i.test(filename),source_timestamp_ms:null};
 sources.push(source);metadata.push(source);
 // Small RGB samples support reproducible differences and palette estimates.
 const rate=2,raw=run('ffmpeg',['-v','error','-i',filename,'-vf',(still?'':'fps=2,')+'crop=iw*.8:ih*.8:iw*.1:ih*.05,scale=48:48','-f','rawvideo','-pix_fmt','rgb24','-']);
 const stride=48*48*3,frames=Math.floor(raw.length/stride),samples=[],colors=new Map();
 for(let f=0;f<frames;f++){
  let difference=0,changed=0,cx=0,cy=0,bright=0;
  for(let i=0;i<stride;i+=3){
   const at=f*stride+i,r=raw[at],g=raw[at+1],b=raw[at+2],max=Math.max(r,g,b),min=Math.min(r,g,b);
   const delta=f?Math.abs(r-raw[at-stride])+Math.abs(g-raw[at-stride+1])+Math.abs(b-raw[at-stride+2]):0;
   difference+=delta;
   if(delta>65){changed++;cx+=(i/3)%48;cy+=Math.floor(i/3/48);}
   if(max>160&&max-min>55){bright++;const color=[r,g,b].map(c=>Math.min(255,Math.floor(c/32)*32+16));const key=color.join(',');colors.set(key,(colors.get(key)??0)+1);}
  }
  samples.push({timestamp_ms:Math.round(f/rate*1000),mean_rgb_difference:difference/stride,changed_fraction:changed/2304,bright_saturated_fraction:bright/2304,motion_centroid:changed?[cx/changed/48,cy/changed/48]:null,near_duplicate:f>0&&difference/stride<1.5,cut_candidate:f>0&&difference/stride>30});
 }
 const cuts=samples.filter(s=>s.cut_candidate).map(s=>s.timestamp_ms);
 const bounds=[0,...cuts,Math.round(duration*1000)].filter((v,i,a)=>i===0||v>a[i-1]);
 for(let i=0;i<bounds.length-1;i++)timeline.push({source_id:id,start_ms:bounds[i],end_ms:bounds[i+1],action_candidate:'UNIDENTIFIED',confidence:'low',body_motion:'requires visual review',face_expression:'unresolved',camera_motion:i?'cut candidate at boundary':'unresolved',vfx_events:'see temporal-samples.json',form:'unresolved',implementation_status:'review',notes:'Boundaries from 2 Hz image difference; flashes and fast camera motion can cause false cuts.'});
 palette[id]={space:'approximate display sRGB',mask:'central 80% width / 80% height; max>160 and chroma>55',colors:[...colors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([rgb,count])=>({rgb:rgb.split(',').map(Number),count})),caveat:'Color bins include costume/background. Exposure and bloom prevent recovery of original shader values.'};
 await writeFile(path.join(folder,'temporal-samples.json'),JSON.stringify(samples,null,2));
 const interval=Math.max(.5,duration/24);
 run('ffmpeg',['-v','error','-i',filename,'-vf',still?'scale=640:-1':`fps=1/${interval},scale=256:-1,tile=4x6`,'-frames:v','1','-y',path.join(folder,'contact.jpg')]);
 // Keyframe candidates include first/last, high difference and high luminous occupancy.
 const chosen=[0,Math.max(0,duration-.1),...samples.filter(s=>s.cut_candidate).map(s=>s.timestamp_ms/1000),...samples.slice().sort((a,b)=>b.bright_saturated_fraction-a.bright_saturated_fraction).slice(0,3).map(s=>s.timestamp_ms/1000)];
 for(const timestamp of [...new Set(chosen)].slice(0,14))run('ffmpeg',['-v','error','-ss',String(timestamp),'-i',filename,'-vf','scale=640:-1','-frames:v','1','-y',path.join(folder,`key-${Math.round(timestamp*1000)}.jpg`)]);
 console.log(id,source.original_name,source.duration_ms+'ms',cuts.length+' cut candidates');
}
function csv(rows){
 if(!rows.length)return '';
 const keys=Object.keys(rows[0]),cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 return [keys.map(cell).join(','),...rows.map(row=>keys.map(key=>cell(row[key])).join(','))].join('\n')+'\n';
}
await writeFile(path.join(output,'sources-manifest.json'),JSON.stringify({version:1,sources,analysis_sample_rate_hz:2,limitations:['2D differences do not identify bones or emotions','VFR flag is heuristic','GIF speed and omissions cannot be proven without original recording']},null,2));
await writeFile(path.join(output,'video-metadata.csv'),csv(metadata));
await writeFile(path.join(output,'automatic-cut-candidates.csv'),csv(timeline));
await writeFile(path.join(output,'vfx-palette.json'),JSON.stringify(palette,null,2));
