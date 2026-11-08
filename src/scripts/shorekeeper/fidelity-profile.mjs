/**
 * Canonical Fidelity F1 · FIDELIDADE profile (EXPERIMENTAL, explicitly selectable, isolated from the G11.3 artistic profile).
 *
 * Why it exists (measured, see F1 report): every shipped combat "ORIGINAL" clip merges a BODY layer with a RIB (cloth) layer.
 * In all 13 source clips (10 combat + 3 idles) the BODY layer holds `Root.quaternion` STATIC at the model's rest pose
 * ([0.7071,0,0,-0.7071]); only the Rib layer animates Root (about 177 deg off, with a 2-3 Hz ripple). Composed into one
 * clip, that Rib Root rotation (a) sways Pelvis/Head and (b) snaps the body ~146 deg in 24 frames on entering Burst02
 * (heading rate 1003 deg/s, 768 deg/s on leaving it). FIDELIDADE lets the BODY layer own Root for the Burst clips:
 * Root.quaternion becomes the BODY layer's own static value. Root.position/scale are already BODY-owned in the Burst clips.
 * No keyframe of any body, face or cloth curve is edited, filtered or retimed; the source clip objects stay untouched.
 *
 * Not a certification: the clip->ability role stays unverified, so every status here is explicit and G7 stays NO_GO.
 */
import {BURST_ORIGINAL_IDS} from './liberation-rotation.mjs';

export const PROFILE_ARTISTIC='ARTISTICO_G113';
export const PROFILE_FIDELITY='FIDELIDADE';
export const FIDELITY_REVISION='F1_FIDELITY_PREVIEW';
/** Per-component acceptance (the owner's visual approval is NOT implied). */
export const FIDELITY_STATUS=Object.freeze({
 bodyClips:'SOURCE_VERIFIED',
 bodyMotion:'MOTION_VERIFIED_DATA_LEVEL',   // runtime == raw clip (<0.001 mm); only the Rib Root ownership differs
 liberationBody:'CANONICAL_PENDING',        // visual comparison against the cutscene camera still required
 presentationVfx:'PRESENTATION_PARTIAL',    // field palette from references; beams/butterflies still authorial
 camera:'PRESENTATION_PARTIAL',             // G11.3 smart camera kept; reference camera is a hard-cut cutscene
 G7:'NO_GO'
});

export function resolveProfile(search=''){
 const q=new URLSearchParams(search),v=(q.get('profile')||'').toLowerCase();
 return v==='fidelity'||v==='fidelidade'?PROFILE_FIDELITY:PROFILE_ARTISTIC;
}

const ROOT_Q='Root.quaternion';
/** The BODY layer's Root orientation of `id`, which must be static (that is the whole premise of the ownership rule). */
export function bodyLayerRoot(library,id){
 const twin=library.filter(c=>c?.name===id+'_BODY');
 if(twin.length!==1)throw Error('FIDELIDADE: BODY layer source missing for '+id+' (no authorial fallback)');
 const tracks=twin[0].tracks.filter(t=>t.name===ROOT_Q);
 if(tracks.length!==1)throw Error('FIDELIDADE: BODY layer has no Root.quaternion for '+id);
 const v=tracks[0].values,n=v.length/4;
 if(n<1||v.length%4||!Array.from(v).every(Number.isFinite))throw Error('FIDELIDADE: invalid BODY Root curve for '+id);
 for(let k=1;k<n;k++)for(let c=0;c<4;c++)if(Math.abs(v[k*4+c]-v[c])>1e-5)throw Error('FIDELIDADE: BODY Root is not static for '+id+' (ownership premise broken)');
 const len=Math.hypot(v[0],v[1],v[2],v[3]);if(!(len>1e-6))throw Error('FIDELIDADE: zero BODY Root quaternion');
 return [v[0]/len,v[1]/len,v[2]/len,v[3]/len];
}

/**
 * Returns {library, derived, originals, provenance}. `library` is a NEW array: each Burst ORIGINAL clip is replaced by a clone whose
 * Root.quaternion is the BODY layer's static value; it keeps the SAME id (the R6.1 plan resolves clips by id). Every other clip is passed
 * by reference. Root.position/scale are already BODY-owned in the Burst clips (verified equal), so only the rotation differs.
 * A missing source or BODY twin is an error: nothing is silently replaced by an authorial animation.
 */
export function applyFidelityBody(T,model,library){
 if(!Array.isArray(library))throw Error('FIDELIDADE requires the authenticated animation library');
 const derived=[],originals=new Map();
 const found=BURST_ORIGINAL_IDS.filter(id=>library.some(c=>c?.name===id));
 if(!found.length)throw Error('FIDELIDADE: no Burst source in the library');
 const out=library.map(c=>{
  if(!c||!BURST_ORIGINAL_IDS.includes(c.name))return c;
  const q=bodyLayerRoot(library,c.name),i=c.tracks.findIndex(t=>t.name===ROOT_Q);
  if(i<0)throw Error('FIDELIDADE: source has no Root.quaternion to re-own: '+c.name);
  const clip=c.clone(),track=new T.QuaternionKeyframeTrack(ROOT_Q,[0,c.duration],[...q,...q]);
  if(!track.validate())throw Error('FIDELIDADE: invalid Root track');
  clip.tracks[i]=track;originals.set(c.name,c);
  derived.push(Object.freeze({id:c.name,variant:c.name+'#ROOT_BODY_OWNED',changedTracks:Object.freeze([ROOT_Q]),rootMode:'BODY_LAYER_STATIC',ribRootKeyframes:c.tracks[i].values.length/4}));
  return clip;
 });
 return Object.freeze({library:out,originals,derived:Object.freeze(derived),
  provenance:Object.freeze({profile:PROFILE_FIDELITY,revision:FIDELITY_REVISION,rootOwnership:'BODY_LAYER',editedCurves:0,changedTracks:Object.freeze(['Root.quaternion(Burst)']),status:FIDELITY_STATUS})});
}
