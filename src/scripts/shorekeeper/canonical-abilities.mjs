/** F3 semantic catalogue, NOT a declaration that names prove canonical correspondence.
 * Assets enter only via the existing authenticated/local verified loader. No fetch/RAF/mixer here.
 */
import {createSourceReviewDirector} from './source-review.mjs';
import {applyFidelityBody} from './fidelity-profile.mjs';
import {canonicalProvenance} from './canonical-source-provenance.mjs';
const item=(id,label,candidates,preconditions=[],events=[])=>Object.freeze({id,label,candidates:Object.freeze(candidates),verification:'CANONICAL_PENDING',motion:'CANONICAL_PENDING',vfx:'CANONICAL_PENDING',camera:'CANONICAL_PENDING',
 durationS:null,events:Object.freeze(events),preconditions:Object.freeze(preconditions),
 entry:'SOURCE_START_NO_FABRICATED_TRANSITION',execution:'EXISTING_SOURCE_REVIEW_BODY_OWNER',recovery:'HOLD_SOURCE_ENDPOINT_NOT_CERTIFIED_LANDING',interruption:'EXISTING_SOURCE_REVIEW_INTERRUPT',disposal:'UNCACHE_ROOT_RELEASE_BODY_OWNER',
 reference:'docs/characters/shorekeeper-f3-recognition.json'});
export const CANONICAL_ABILITIES=Object.freeze([
 item('idle','Idle · três originais',['SK_IDLE_01_ORIGINAL','SK_IDLE_02_ORIGINAL','SK_IDLE_03_ORIGINAL']),
 ...[1,2,3,4].map(n=>item('basic-'+n,'Origin Calculus · Basic '+n,['SK_ATTACK_0'+n+'_ORIGINAL'])),
 item('heavy-unbound','Heavy · Unbound Form',[],['TRANSFORMATION_GEOMETRY_AND_ENTRY_FLIGHT_EXIT_MATCH_REQUIRED']),
 item('heavy-illation','Enhanced Heavy · Illation',[],['FIVE_EMPIRICAL_DATA','DARK_CORE_AND_RING_MATCH_REQUIRED']),
 item('skill-chaos','Chaos Theory',['SK_SKILL_01_ORIGINAL'],[],['FIVE_DIM_STAR_BUTTERFLIES_PENDING_MATCH']),
 item('liberation-end-loop','End Loop',['SK_BURST_01_ORIGINAL','SK_BURST_02_ORIGINAL'],[],['HAND_FLARE','OUTER_FORMATION']),
 item('intro-discernment','Discernment',['SK_SKILL_QTE_01_ORIGINAL','SK_BURST_01_ORIGINAL'],['SUPERNAL_ACTIVE','SHOREKEEPER_INTRO'],['FIELD_ENDING_DISCHARGE_PENDING_MATCH']),
 item('dodge-counter','Dodge Counter',[],['SUCCESSFUL_DODGE']),
 item('mid-air-attack','Mid-air Attack',[],['AIRBORNE']),
 ...['outer','inner','supernal'].map(s=>item('stellarealm-'+s,'Stellarealm · '+s,[],s==='outer'?['END_LOOP']:['VALIDATED_INTRO_EVENTS']))
]);
export function canonicalCatalogue(library=[],provenance=canonicalProvenance){
 return CANONICAL_ABILITIES.map(row=>({...row,sources:row.candidates.map(id=>{const clips=library.filter(c=>c.name===id),receipt=clips.length===1?provenance.receipt(clips[0]):null;return {id,available:!!receipt,durationS:clips.length===1?clips[0].duration:null,sourceStatus:receipt?'SOURCE_VERIFIED':clips.length?'SOURCE_UNVERIFIED':'SOURCE_UNAVAILABLE',sourceSha256:receipt?.sha256??null};}),playable:false}));
}
/** Deliberately manual source QA. A successful return never means MOTION_MATCHED.
 * The host must dispose the previous body owner first; the existing lease enforces that.
 */
export async function createCanonicalSourceInspection(T,model,library,{actionId,sourceId,explicitSourceQA=false,onEvent,admit=()=>true,provenance=canonicalProvenance}={}){
 if(!explicitSourceQA)throw Error('CANONICAL_PENDING: source inspection requires explicit opt-in');
 const row=CANONICAL_ABILITIES.find(r=>r.id===actionId);
 if(!row||!row.candidates.includes(sourceId))throw Error('CANONICAL_PENDING: no verified source selection for '+actionId);
 const candidates=library.filter(c=>c.name===sourceId);if(candidates.length!==1)throw Error('SOURCE_UNAVAILABLE: '+sourceId);
 await provenance.require(library,[sourceId,...(sourceId.startsWith('SK_BURST_')?[sourceId+'_BODY']:[])]);
 if(!admit())throw new DOMException('Source inspection cancelled','AbortError');
 // Preserve F1 BODY Root ownership for Burst QA; no filtering of acrobatic sources.
 const clip=sourceId.startsWith('SK_BURST_')?applyFidelityBody(T,model,library.filter(c=>[sourceId,sourceId+'_BODY',sourceId+'_RIB'].includes(c.name))).library.find(c=>c.name===sourceId):candidates[0];
 const director=createSourceReviewDirector(T,model,clip,{onEvent});
 return Object.assign(director,{canonicalStatus:'CANONICAL_PENDING',actionId,sourceId});
}
/** Explicit event contract. No wall clock, automatic colour ramp or fabricated intro.
 * Input events must be validated by the host/gameplay source; this is not a combat simulator.
 */
export function createStellarealmContract(){
 let state='NONE',disposed=false;const seen=new Set();let lastSequence=-1;
 return {event(e){if(disposed||!e||typeof e.id!=='string'||!e.id||!Number.isSafeInteger(e.sequence)||e.sequence<=lastSequence||seen.has(e.id))return false;
  let next=null;
  if(e.type==='END_LOOP'&&e.validated===true&&state==='NONE')next='OUTER';
  if(e.type==='INTRO'&&e.validated===true&&e.inside===true&&e.actor!=='shorekeeper'&&typeof e.actor==='string'&&e.actor){if(state==='OUTER')next='INNER';else if(state==='INNER')next='SUPERNAL';}
  if(e.type==='DISCERNMENT'&&e.validated===true&&e.actor==='shorekeeper'&&state==='SUPERNAL')next='NONE';
  if(e.type==='EXPIRE'&&e.validated===true&&state!=='NONE')next='NONE';
  if(next===null)return false;lastSequence=e.sequence;seen.add(e.id);state=next;if(state==='NONE')seen.clear();return true;
 },get state(){return state;},dispose(){disposed=true;state='NONE';seen.clear();}};
}
