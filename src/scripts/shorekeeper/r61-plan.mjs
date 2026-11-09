import {buildComboSchedule} from './combo-sequencer.mjs';

/**
 * R6.1 is an expressly AUTHORIAL assembly of authentic, unchanged animation
 * curves. Clip names identify converter sources, NOT certified game abilities.
 * In particular the cupped-hands B1 pose was not found in the R608 10/10
 * audit and must not be manufactured by this preview.
 */
export const R61_SOURCE_IDS=Object.freeze([
 'SK_ATTACK_01_ORIGINAL','SK_ATTACK_02_ORIGINAL','SK_ATTACK_03_ORIGINAL',
 'SK_ATTACK_L02_ORIGINAL','SK_SKILL_01_ORIGINAL',
 'SK_BURST_02_ORIGINAL','SK_IDLE_01_ORIGINAL'
]);
export const R61_STATUS='R61_AUTHORIAL_PREVIEW_SOURCE_MAPPING_PENDING';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/**
 * @param opts.burstEntry 'blend' (default, G11.3: 0.2 s cross-fade) | 'cut' (FIDELIDADE: hard cut into the Burst, to be hidden by a camera cut;
 *   the Burst clip starts airborne ~0.8 m above where the Skill ends, so any blend is a 1 m slide in 0.2 s).
 */
export function buildR61Plan(library, {burstEntry = 'blend', study = null} = {}) {
 if(!['blend','cut'].includes(burstEntry))throw Error('R6.1 unknown burstEntry');
 // F1.4 STUDY_PRESENTATION: the SEVEN combat steps stay byte-identical (same indices, durations, fades). The extra time is ONLY more of the
 // original idle clips at 1x: the recovery step (SK_IDLE_01) is allowed to keep playing instead of being cut at 1.45 s, and up to two further
 // original idles follow. No clip is retimed, edited or repeated (the score requires unique segment ids).
 if(study!==null&&(typeof study!=='object'||!Number.isFinite(study.recoveryS)||!(study.recoveryS>=1.45)||!Array.isArray(study.tail)))throw Error('R6.1 invalid study plan');
 if(!Array.isArray(library))throw Error('R6.1 requires an authenticated private animation library');
 const clips={},missing=[];
 for(const id of R61_SOURCE_IDS){
  const matches=library.filter(c=>c?.name===id);
  if(matches.length!==1){missing.push(id);continue;}
  const c=matches[0];
  if(!Number.isFinite(c.duration)||c.duration<=0||!c.tracks?.length||
   c.tracks.some(t=>! /\.(?:position|quaternion|scale)$/.test(t.name)))
   throw Error('R6.1 invalid body source: '+id);
  clips[id]=c;
 }
 // Never silently replace a missing HA, Skill or Burst with another movement.
 if(missing.length)throw Error('R6.1 incomplete sources: '+missing.join(', '));
 const steps=R61_SOURCE_IDS.map((id,i)=>{
  const duration=clips[id].duration,exit=i===6?Math.min(study?study.recoveryS:1.45,duration):duration;
  // the Burst->Recovery cross-fade is a COMBAT blend: it is computed on the canonical 1.45 s recovery exit even when a study keeps the idle playing longer
  return {id,duration,exit,fade:i===0?0:i===5&&burstEntry==='cut'?0:Math.min(i===6?.38:.20,(i===6?Math.min(1.45,duration):exit)*.24)};
 });
 const tailIds=new Set();
 if(study)for(const t of study.tail){
  const matches=library.filter(c=>c?.name===t.id);
  if(R61_SOURCE_IDS.includes(t.id)||tailIds.has(t.id)||matches.length!==1||!/^SK_IDLE_0[1-3]_ORIGINAL$/.test(t.id))throw Error('R6.1 invalid study tail: '+t.id);
  const c=matches[0];
  if(!Number.isFinite(c.duration)||c.duration<=0||!c.tracks?.length||c.tracks.some(k=>! /\.(?:position|quaternion|scale)$/.test(k.name)))throw Error('R6.1 invalid body source: '+t.id);
  if(!(t.exit>1&&t.exit<=c.duration))throw Error('R6.1 study tail window outside the clip: '+t.id);
  tailIds.add(t.id);clips[t.id]=c;steps.push({id:t.id,duration:c.duration,exit:t.exit,fade:Math.min(.6,t.exit*.24)});
 }
 const schedule=buildComboSchedule(steps),s=schedule.segments;
 const burst=s[5],recovery=s[6],burstSpan=burst.end-burst.start;
 const cues=[
  {t:0,state:'AMBIENT',beat:'THREE_BASIC_CANDIDATES'},
  {t:s[3].start,state:'PREPARATION',beat:'HEAVY_ATTACK_CANDIDATE'},
  {t:s[4].start,state:'PREPARATION',beat:'RESONANCE_SKILL_CANDIDATE'},
  {t:burst.start,state:'PREPARATION',beat:'BURST02_INTRO_B1_UNVERIFIED'},
  {t:burst.start+burstSpan*.27,state:'STELLAREALM',beat:'OUTER_FIELD_AUTHORIAL'},
  {t:burst.start+burstSpan*.53,state:'RESONANCE_PEAK',beat:'LIBERATION_PEAK_AUTHORIAL'},
  {t:burst.start+burstSpan*.76,state:'STELLAREALM',beat:'FIELD_PERSIST_AUTHORIAL'},
  {t:recovery.start,state:'RECOVERY',beat:'RETURN_NO_CERTIFIED_LANDING'},
  ...(study?[{t:Math.min(schedule.duration,recovery.start+1.45),state:'AMBIENT',beat:'STUDY_CONTEMPLATIVE_IDLE_NOT_CANONICAL'}]:[]),
  {t:schedule.duration,state:'AMBIENT',beat:'IDLE'}
 ];
 return Object.freeze({
  clips,schedule,cues:Object.freeze(cues.map(c=>Object.freeze(c))),
  identity:'SOURCE_ROLE_UNVERIFIED',sourceFrame:null,b1:'NO_SUSTAINED_CUPPED_HAND_POSE_CONFIRMED',
  performance:'MOBILE_GPU_PENDING',status:R61_STATUS,burstEntry,study:study?Object.freeze({recoveryS:study.recoveryS,tail:Object.freeze(study.tail.map(t=>Object.freeze({...t})))}):null
 });
}
export function r61CueAt(plan,t) {
 if(!Number.isFinite(t)||t<0||t>plan.schedule.duration)throw Error('R6.1 invalid sequence time');
 let current=plan.cues[0];
 for(const cue of plan.cues){if(t+1e-9>=cue.t)current=cue;else break;}
 return current;
}
/** Camera motion is artistic, independent of the source clips and game camera. */
export function r61CameraPose(plan,t,aspect=16/9){
 const segs=plan.schedule.segments,burst=segs[5],recovery=segs[6];
 const at=[
  {t:0,angle:-.18,r:3.9,elev:.48,look:.40,fov:35},
  {t:segs[2].start,angle:.20,r:4.1,elev:.55,look:.42,fov:35},
  {t:segs[3].start,angle:.45,r:4.9,elev:.46,look:.35,fov:37},
  {t:segs[4].start,angle:-.24,r:4.3,elev:.48,look:.43,fov:34},
  {t:burst.start,angle:-.13,r:2.6,elev:.60,look:.57,fov:33},
  {t:burst.start+(burst.end-burst.start)*.28,angle:.16,r:3.8,elev:.82,look:.54,fov:38},
  {t:burst.start+(burst.end-burst.start)*.70,angle:.35,r:6.2,elev:1.10,look:.68,fov:45},
  {t:recovery.start,angle:.20,r:5.2,elev:.84,look:.40,fov:38},
  {t:plan.schedule.duration,angle:0,r:3.8,elev:.45,look:.40,fov:35}
 ];
 const x=clamp(t,0,plan.schedule.duration);
 let i=0;while(i<at.length-2&&x>at[i+1].t)i++;
 const a=at[i],b=at[i+1],length=b.t-a.t;
 const raw=length>0?clamp((x-a.t)/length,0,1):1,u=raw*raw*(3-2*raw);
 const lerp=k=>a[k]+(b[k]-a[k])*u;
 // Portrait needs extra distance to keep the body AND Outer canopy in frame.
 return {azimuth:lerp('angle'),radius:lerp('r')*(aspect<.78?1.36:1),
  elevation:lerp('elev'),look:lerp('look'),fov:lerp('fov'),preset:'r61-authorial'};
}
