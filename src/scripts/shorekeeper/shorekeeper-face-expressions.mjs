// Shorekeeper facial expression layer (F2.1-F, candidate). Standalone ES module, no Three.js import.
// Writes ONLY morphTargetInfluences of the meshes passed in. Never touches bones, the AnimationMixer,
// the approved idles or the approved bilateral blink (E_Close is NEVER written here).
// Weights come from region-guided offline renders (see report); status is VISUAL_QA_PENDING until
// checked in real WebGL with the app's material.

export const GLB_SHA256 = '4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30';

/** Meshes that own facial morphs. Down/Alpha also carry L_ and R_ prefixed names: never addressed here. */
export const FACE_MESHES = Object.freeze(['Shorekeeper_Face', 'Shorekeeper_Eye']);

/** Morphs that move the eyelids; damped while the approved blink is closing. */
export const LID_CHANNELS = Object.freeze(['E_Smile_L', 'E_Smile_R', 'E_Sad', 'E_Stare', 'E_Insipid', 'E_Focus']);

/** Morph names owned by the approved blink controller. This module refuses to write them. */
export const BLINK_OWNED = Object.freeze(['E_Close']);

/** Iris leaves the eye aperture above ~0.3-0.5 in the base-colour render. */
export const PUPIL_CAP = 0.3;

const f = (o) => Object.freeze(Object.assign({}, o));

export const RECIPES = Object.freeze({
  MY_STAR:       { ref: 1,  status: 'PARTIAL', weights: f({ M_Smile_L: 1, M_Smile_R: 1, P_M_L_Add: 1, P_M_R_Add: 1, E_Smile_L: 0.25, E_Smile_R: 0.25, C_ZL_Face: 1, C_ZR_Face: 1 }), timing: f({ attack: 1.1, hold: 1.6, release: 1.4 }) },
  LITTLE_SMILE:  { ref: 4,  status: 'PARTIAL', weights: f({ M_Smile_L: 0.9, M_Smile_R: 0.5, P_M_L_Add: 0.7, P_M_R_Add: 0.3, C_ZL_Face: 0.8 }), timing: f({ attack: 0.9, hold: 1.2, release: 1.2 }) },
  HELLO:         { ref: 5,  status: 'PARTIAL', weights: f({ M_Smile_L: 0.8, M_Smile_R: 0.8, P_M_L_Add: 0.8, P_M_R_Add: 0.8, M_OpenSmall: 0.4, S_02: 0.32 }), timing: f({ attack: 0.7, hold: 1.4, release: 1.2 }) },
  LOVE:          { ref: 3,  status: 'PARTIAL', weights: f({ M_Smile_L: 0.6, M_Smile_R: 0.6, P_M_L_Add: 0.5, P_M_R_Add: 0.5, E_Smile_L: 0.2, E_Smile_R: 0.2, E_Insipid: 0.3 }), timing: f({ attack: 1.3, hold: 2.0, release: 1.6 }) },
  // HOPE needs closed eyes: the closure is REQUESTED from the blink owner, never written here.
  HOPE:          { ref: 7,  status: 'PARTIAL', weights: f({ M_Smile_L: 0.5, M_Smile_R: 0.5, P_M_L_Add: 0.4, P_M_R_Add: 0.4 }), eyeClosure: 1, timing: f({ attack: 1.4, hold: 2.2, release: 1.6 }) },
  SURPRISE_SOFT: { ref: 2,  status: 'GEOMETRY_ONLY', weights: f({ E_Stare: 0.6, B_Up_Add: 0.6, M_OpenSmall: 0.5 }), timing: f({ attack: 0.35, hold: 0.9, release: 0.9 }) },
  WORRIED:       { ref: 6,  status: 'GEOMETRY_ONLY', weights: f({ B_Sad: 1, E_Sad: 0.7, M_Ennui_L: 1, M_Ennui_R: 1 }), timing: f({ attack: 1.0, hold: 1.8, release: 1.4 }) },
  GLANCE:        { ref: 10, status: 'GEOMETRY_ONLY', weights: f({ E_Focus: 0.5, Pupil_L: 0.3, E_Insipid: 0.2 }), timing: f({ attack: 0.5, hold: 0.8, release: 0.7 }) },
});

/** Not recoverable with morphs alone (documented, never faked). */
export const UNSUPPORTED = Object.freeze({
  MEME: 'Estilo 2D chibi com bochechas infladas; nao ha morph de bochecha inflada.',
  RIG_FISHEYE: 'Efeito de camera (olho de peixe/inclinacao) e brilho de shader; nao e deformacao facial.',
  WINK: 'E_Close e bilateral; piscadela de um olho exige corrective shape.',
});

const clamp=(v,max=1)=>Math.max(0,Math.min(max,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
/** Owns only recipe channels on Face/Eye. E_Close remains an ocular request. */
export function createFaceExpressionController({meshes=[],recipes=RECIPES}={}){
 const channels=new Set(Object.values(recipes).flatMap(r=>Object.keys(r.weights)).filter(n=>!BLINK_OWNED.includes(n))),slots=[];
 for(const m of meshes){if(!FACE_MESHES.includes(m.name))continue;for(const [name,index] of Object.entries(m.morphTargetDictionary??{})){
  if(!channels.has(name))continue;const influences=m.morphTargetInfluences;
  if(!Number.isInteger(index)||index<0||index>=influences?.length||!Number.isFinite(influences[index]))throw Error('Invalid morph binding: '+name);
  const base=clamp(influences[index],name.startsWith('Pupil_')?PUPIL_CAP:1);slots.push({name,index,influences,base,value:base,from:base,to:base});
 }}
 let active=null,phase='idle',elapsed=0,timing=null,paused=false,disposed=false,blink=0,eye=0,eyeFrom=0,eyeTo=0;
 const have=new Set(slots.map(s=>s.name));
 function write(){for(const s of slots)s.influences[s.index]=clamp(s.value*(LID_CHANNELS.includes(s.name)?1-blink:1),s.name.startsWith('Pupil_')?PUPIL_CAP:1);}
 function transition(toEye){for(const s of slots)s.from=s.value;eyeFrom=eye;eyeTo=toEye;elapsed=0;}
 function cancel(){if(disposed||phase==='idle')return;transition(0);for(const s of slots)s.to=s.base;phase='release';}
 return {
  list:()=>Object.keys(recipes),support:name=>{const r=recipes[name],missing=r?Object.keys(r.weights).filter(n=>!have.has(n)):[];return {available:!!r&&!missing.length,missing,visualQA:'PENDING',automatic:false};},
  trigger(name,{intensity=1,attack,hold,release}={}){
   if(disposed)return false;const r=recipes[name];if(!r||Object.keys(r.weights).some(n=>!have.has(n)))return false;
   const next={attack:attack??r.timing.attack,hold:hold??r.timing.hold,release:release??r.timing.release};
   if(!Number.isFinite(intensity)||intensity<0||intensity>1||Object.values(next).some(v=>!Number.isFinite(v)||v<0)||next.attack<=0||next.release<=0)throw Error('Invalid expression timing or intensity');
   timing=next;transition((r.eyeClosure??0)*intensity);for(const s of slots)s.to=clamp(s.base+(r.weights[s.name]??0)*intensity*(1-s.base),s.name.startsWith('Pupil_')?PUPIL_CAP:1);
   active=name;phase='attack';return true;
  },
  setBlink(v){if(!Number.isFinite(v))throw Error('Invalid blink');blink=clamp(v);write();},
  getEyeClosureRequest:()=>eye,
  suspend(){paused=true;},resume(){paused=false;},cancel,
  isActive:()=>phase!=='idle',isSafeToTransfer:()=>phase==='idle',current:()=>active,
  update(dt){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid dt');if(disposed||paused||!dt||phase==='idle')return;
   let remaining=dt;
   for(let count=0;count<4&&phase!=='idle';count++){
    const duration=phase==='attack'?timing.attack:phase==='hold'?timing.hold:timing.release,step=Math.min(remaining,Math.max(0,duration-elapsed));elapsed+=step;remaining-=step;
    if(phase!=='hold'){const k=smooth(duration?elapsed/duration:1);for(const s of slots)s.value=s.from+(s.to-s.from)*k;eye=eyeFrom+(eyeTo-eyeFrom)*k;}
    if(elapsed+1e-10<duration)break;
    if(phase==='attack'){phase='hold';elapsed=0;}else if(phase==='hold'){cancel();}else{for(const s of slots)s.value=s.base;eye=0;active=null;phase='idle';}
    if(remaining<=0)break;
   }write();
  },
  dispose(){for(const s of slots)s.influences[s.index]=s.base;active=null;eye=0;phase='idle';disposed=true;},
  get state(){return {phase,expression:active,paused,eyeClosure:eye,weights:Object.fromEntries(slots.map(s=>[s.name,s.influences[s.index]])),visualQA:'PENDING'};}
 };
}
