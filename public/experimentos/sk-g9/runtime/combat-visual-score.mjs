/** S0 data-only contract. No runtime integration or canonical ability approval. */
export const SCORE_CHANNELS = Object.freeze(['blueAttack','blueCore','heavyPulse','healingPulse','guidedButterflies','liberationField']);
const ROLES = ['BASIC','HEAVY','SKILL','LIBERATION','RECOVERY'];
const CHANNEL_ROLES = {blueAttack:['BASIC'],blueCore:['BASIC','HEAVY'],heavyPulse:['HEAVY'],healingPulse:['SKILL'],guidedButterflies:['SKILL'],liberationField:['LIBERATION','RECOVERY']};
const smooth = x => x*x*(3-2*x);
const fail = message => { throw new TypeError('Visual score: '+message); };
const dense = a => Array.isArray(a) && Array.from({length:a.length},(_,i)=>i in a).every(Boolean);

/** Compile once; every sample depends only on explicit presentation time.
 * Segments may overlap: clipId is explicit during blends; no body weights are chosen.
 * start/peak/end are authored presentation seconds, never GIF/PSA/clip timestamps.
 */
export function createCombatVisualScore(schedule, sourceMapping = {}, simulatedEvents = []) {
  if (!schedule || !Number.isFinite(schedule.duration) || schedule.duration<=0 || !dense(schedule.segments) || !schedule.segments.length) fail('schedule');
  if (!sourceMapping || typeof sourceMapping!=='object' || Array.isArray(sourceMapping) || !dense(simulatedEvents)) fail('mapping/events');
  const duration=schedule.duration, segments=new Map();
  for (const s of schedule.segments) {
    if (!s || typeof s.id!=='string' || !s.id || segments.has(s.id) || ![s.start,s.end].every(Number.isFinite) || s.start<0 || s.start>=s.end || s.end>duration) fail('segment');
    const m=Object.hasOwn(sourceMapping,s.id)?sourceMapping[s.id]:null;
    if (m && (!ROLES.includes(m.role) || !['SYNTHETIC','SOURCE_ROLE_UNVERIFIED'].includes(m.confidence))) fail('role mapping');
    segments.set(s.id,Object.freeze({id:s.id,start:s.start,end:s.end,role:m?.role??null,confidence:m?.confidence??'SOURCE_ROLE_UNVERIFIED'}));
  }
  const skills=[...segments.values()].filter(s=>s.role==='SKILL');
  const skillEnd=skills.length?Math.max(...skills.map(s=>s.end)):null;
  const ids=new Set(), pending=[];
  const events=simulatedEvents.map(e=>{
    if (!e || typeof e.id!=='string' || !e.id || ids.has(e.id)) fail('event id');
    ids.add(e.id);
    const s=segments.get(e.clipId);
    if (!s || !SCORE_CHANNELS.includes(e.channel) || !CHANNEL_ROLES[e.channel].includes(s.role)) fail('event role/channel');
    if (!['PENDING','SYNTHETIC','AUTHORIAL'].includes(e.basis) || typeof e.evidence!=='string' || !e.evidence.trim()) fail('provenance');
    if (e.basis==='PENDING') {
      if (e.start!==null || e.peak!==null || e.end!==null) fail('pending timestamps must be null');
      pending.push(e.id);return null;
    }
    if (![e.start,e.peak,e.end].every(Number.isFinite) || e.start<s.start || e.start>=e.peak || e.peak>=e.end || e.end>s.end) fail('event window');
    if (e.channel==='liberationField' && (skillEnd===null || e.start<skillEnd)) fail('field before Skill completion');
    return Object.freeze({id:e.id,clipId:e.clipId,channel:e.channel,basis:e.basis,evidence:e.evidence,start:e.start,peak:e.peak,end:e.end});
  }).filter(Boolean).sort((a,b)=>a.start-b.start||(a.id<b.id?-1:a.id>b.id?1:0));
  Object.freeze(pending.sort());
  return Object.freeze({
    cueAt(absoluteTime, clipId=null, viewportAspect=16/9) {
      if (!Number.isFinite(absoluteTime) || absoluteTime<0 || absoluteTime>duration || !Number.isFinite(viewportAspect) || viewportAspect<=0) fail('sample');
      const segment=clipId===null?null:segments.get(clipId);
      if (clipId!==null && (!segment || absoluteTime<segment.start || absoluteTime>=segment.end)) fail('inactive clip');
      const levels=Object.fromEntries(SCORE_CHANNELS.map(c=>[c,0])), provenance=[];
      for (const e of events) {
        if (absoluteTime<e.start || absoluteTime>=e.end) continue;
        const x=absoluteTime<=e.peak?(absoluteTime-e.start)/(e.peak-e.start):(e.end-absoluteTime)/(e.end-e.peak);
        levels[e.channel]=Math.max(levels[e.channel],smooth(x));
        provenance.push(Object.freeze({id:e.id,clipId:e.clipId,basis:e.basis,evidence:e.evidence,simulation:'SIMULATED',sourceFrame:null}));
      }
      return Object.freeze({presentationTime:absoluteTime,beat:segment?.role??'NONE',roleConfidence:segment?.confidence??'SOURCE_ROLE_UNVERIFIED',...levels,
        cameraCue:null,anchorStatus:'UNRESOLVED',eventProvenance:Object.freeze(provenance),pending,
        viewportClass:viewportAspect<1?'PORTRAIT':'LANDSCAPE',sourceFrame:null,integration:'G7_NO_GO'});
    }
  });
}

/** Convenience API; prefer the compiled evaluator when sampling repeatedly. */
export function combatVisualScore(schedule, absoluteTime, clipId, viewportAspect, sourceMapping, simulatedEvents) {
  return createCombatVisualScore(schedule,sourceMapping,simulatedEvents).cueAt(absoluteTime,clipId,viewportAspect);
}
