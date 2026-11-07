import {createGentleFace} from './gentle-acting.mjs';
import {MOUTH_QA_RECIPES} from './mouth-qa-probes.mjs';
import {RECIPES,LID_CHANNELS} from './shorekeeper-face-expressions.mjs';
import {claimFacialWriter, facialMeshes, facialOwner} from './facial-ownership.mjs';

export const R6_REGIONS = Object.freeze(['brow','lid','cheek','mouth','nasal','gaze']);
export const R6_LAYERS = Object.freeze(['BASELINE_APPROVED','EMOTIONAL_POSE','BROW_CHEEK_ACCENT','GAZE','OCULAR_BLINK','RECOVERY']);
export const PUPIL_CAP = .3;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };
const clamp = (v, cap = 1) => Math.max(0, Math.min(cap, v));
export function facialRegion(name) {
  if (name.startsWith('Pupil_')) return 'gaze';
  if (name.startsWith('B_')) return 'brow';
  if (name.startsWith('E_')) return 'lid';
  if (name.startsWith('P_Nose_')) return 'nasal';
  if (name.startsWith('C_')) return 'cheek'; // Compound lower-face region, NOT an isolated cheek muscle.
  return 'mouth';
}
const candidate = (label, source, accent, extra = {}) => Object.freeze({label, source, accent: Object.freeze(accent), duration: 5.8, status: 'R6_ACTING_CANDIDATE', ...extra});
export const R6_CANDIDATES = Object.freeze({
  LITTLE_SMILE_ACTING_R6: candidate('Little Smile · atuação R6','LITTLE_SMILE_V2',{B_Happy:.12}),
  MY_STAR_ACTING_R6: candidate('My Star · atuação R6','MY_STAR_V2',{B_Happy:.18},{intermediateEyes:true}),
  AFFECT_GROWING_R6: candidate('Afeto crescente · R6','MY_STAR_R3_EYES_SOFT',{B_Happy:.1}),
  HELLO_ACTING_R6: candidate('Olá fechado · R6','HELLO_R2_CANDIDATE',{B_Happy:.12}),
  TENDERNESS_ACTING_R6: candidate('Ternura · candidato R6','LOVE',{B_Happy:.08,P_Nose_Up:.025},{binding:'NAMED_APPEARANCE_RECIPE_UNVERIFIED'}),
  SERENITY_ACTING_R6: candidate('Serenidade · candidato R6','HOPE',{B_Happy:.08,C_Down_Face:.04},{binding:'NAMED_APPEARANCE_RECIPE_UNVERIFIED'}),
  WORRIED_FIXED_R6: candidate('Preocupação · boca neutra R6','WORRIED',{}, {oralRepair:true}),
  GLANCE_BILATERAL_R6: candidate('Olhar bilateral · R6','GLANCE',{}, {bilateral:true, duration:6.8}),
  EYES_WIDE_ACTING_R6: candidate('Olhos arregalados · surpresa R6','SURPRISE_SOFT',{}, {wideEyes:true, status:'R6_MANUAL_VISUAL_QA_PENDING'}),
});
const recipeFor = id => MOUTH_QA_RECIPES[id] ?? RECIPES[id];
// These are per-region ACCENT budgets. Approved baseline channels are never normalized.
export const R6_ACCENT_BUDGET = Object.freeze({brow:.22,lid:.15,cheek:.12,mouth:.1,nasal:.05,gaze:.3});
const pulse = (t, on, full, release, end) => smooth((t-on)/(full-on)) * (1-smooth((t-release)/(end-release)));
const combatClip = clip => /^SK_(?:ATTACK|SKILL|AIR_SKILL|BURST)_/.test(clip ?? '') || clip === 'SK_COMBO_EXPERIMENTAL';

/** One live Face/Eye writer. Legacy baseline/blink evaluates on private numeric arrays.
 * No geometry, materials, bones, mixer, timer or render loop is owned by this director.
 */
export function createAnatomicalFaceDirector(inspection, {qaRecipes=MOUTH_QA_RECIPES} = {}) {
  const meshes = facialMeshes(inspection);
  const release = claimFacialWriter(inspection, 'anatomical-face-r6');
  const initial = meshes.map(m => Array.from(m.morphTargetInfluences));
  const slots = [], names = [], nameIndex = new Map();
  for (const m of meshes) for (const [name,index] of Object.entries(m.morphTargetDictionary)) {
    if (!nameIndex.has(name)) { nameIndex.set(name,names.length); names.push(name); }
    slots.push({mesh:m,index,n:nameIndex.get(name)});
  }
  const values = new Float64Array(names.length), output = Object.fromEntries(names.map(n=>[n,0]));
  const shadowMeshes = meshes.map(m=>({name:m.name,morphTargetDictionary:m.morphTargetDictionary,morphTargetInfluences:new Array(m.morphTargetInfluences.length).fill(0)}));
  const shadow = {names:inspection.names, morphMeshes:shadowMeshes, weights:{}};
  shadow.setFacialMorphs = weights => {
    Object.assign(shadow.weights,weights);
    for (const m of shadowMeshes) for (const [n,i] of Object.entries(m.morphTargetDictionary)) m.morphTargetInfluences[i]=shadow.weights[n]??0;
  };
  let legacy;try{legacy=createGentleFace(shadow,{qaRecipes});}catch(error){release();throw error;}
  const enabled = Object.fromEntries(R6_REGIONS.map(r=>[r,true]));
  let mode='neutral',id='NEUTRAL',clock=0,amount=1,paused=false,frozen=false,combat=false,disposed=false,probe=null;
  let compiled=[],closureRequest=0,releaseAt=null,releaseWeights=new Float64Array(names.length),writeCount=0;
  const put = (name,value) => {const i=nameIndex.get(name);if(i!==undefined)values[i]=value;};
  const get = name => values[nameIndex.get(name)]??0;
  function commit() {
    for (let i=0;i<names.length;i++) output[names[i]]=values[i];
    if (inspection.weights) Object.assign(inspection.weights,output);
    for (const s of slots) s.mesh.morphTargetInfluences[s.index]=values[s.n];
    writeCount++;
  }
  function clearShadow() {
    for (const name of names) shadow.weights[name]=0;
    for (const m of shadowMeshes) m.morphTargetInfluences.fill(0);
    legacy.reset();
  }
  function fromShadow() {
    values.fill(0);
    for (const m of shadowMeshes) for (const [name,index] of Object.entries(m.morphTargetDictionary)) put(name,m.morphTargetInfluences[index]);
  }
  function compile(spec) {
    const r=recipeFor(spec.source), tracks=[];
    for (const [name,weight] of Object.entries(r.weights)) {
      if (spec.oralRepair && facialRegion(name)==='mouth') continue; // Isolated M_Ennui produces the second lip line. Keep the neutral canonical mouth.
      if (spec.bilateral && name.startsWith('Pupil_')) continue;
      if (name==='E_Close') throw Error('E_Close belongs to OCULAR_BLINK');
      // Explicit standalone QA expression: stronger E_Stare, never E_Close or blink redefinition.
      const target=spec.wideEyes&&name==='E_Stare'?Math.min(1,weight+.25):weight;
      tracks.push({name,weight:target,region:facialRegion(name),accent:false});
    }
    const totals=Object.fromEntries(R6_REGIONS.map(r=>[r,0]));
    for (const [name,weight] of Object.entries(spec.accent)) {
      if (!Number.isFinite(weight)||weight<0||name==='E_Close') throw Error('Invalid accent');
      const region=facialRegion(name);totals[region]+=weight;
      if (totals[region]>R6_ACCENT_BUDGET[region]+1e-12) throw Error('Accent budget exceeded');
      tracks.push({name,weight,region,accent:true});
    }
    return tracks;
  }
  function evaluate() {
    fromShadow();
    if (mode==='baseline'||mode==='legacy'||mode==='neutral') {commit();return;}
    const blink = get('E_Close');
    values.fill(0);closureRequest=0;
    if (mode==='probe') {
      if (probe.name==='E_Close') closureRequest=probe.weight;
      else put(probe.name,probe.weight);
    } else {
      const spec=R6_CANDIDATES[id];
      for (const tr of compiled) {
        if (!enabled[tr.region]) continue;
        const early=tr.region==='brow'||tr.region==='lid',late=tr.region==='cheek';
        let k=pulse(clock,early?.06:late?.24:.15,early?.65:late?1.2:1,3.55,5.8);
        if (spec.intermediateEyes && tr.name.startsWith('E_Smile')) {
          k=pulse(clock,.06,.65,3.55,5.8)*(.4+.6*smooth((clock-1.05)/.55));
        }
        put(tr.name,clamp(tr.weight*amount*k));
      }
      const r=recipeFor(spec.source);
      if (enabled.lid) closureRequest=(r.eyeClosure??0)*amount*pulse(clock,.06,.8,3.55,5.8);
      if (spec.bilateral&&enabled.gaze) {
        // Geometry: L has positive local X (character left, viewer right in the frontal camera).
        put('Pupil_L',.22*amount*pulse(clock,.15,.55,1.35,1.85));
        put('Pupil_R',.22*amount*pulse(clock,2.5,2.9,3.8,4.35));
      }
    }
    const closure=Math.max(blink,closureRequest);
    put('E_Close',closure);
    for (const n of LID_CHANNELS) put(n,get(n)*(1-closure));
    // Signed gaze cancels opposing requests, with a vector (not per-axis-only) cap.
    let x=get('Pupil_L')-get('Pupil_R'),y=get('Pupil_Up')-get('Pupil_Down');
    const mag=Math.hypot(x,y),scale=mag>PUPIL_CAP?PUPIL_CAP/mag:1;
    x*=scale;y*=scale;
    put('Pupil_L',Math.max(0,x));put('Pupil_R',Math.max(0,-x));put('Pupil_Up',Math.max(0,y));put('Pupil_Down',Math.max(0,-y));
    put('Pupil_Scale',clamp(get('Pupil_Scale'),PUPIL_CAP));
    if(releaseAt!==null) {
      const k=1-smooth((clock-releaseAt)/.65);
      for(let i=0;i<values.length;i++)values[i]=releaseWeights[i]*k;
      // Blink remains the sole ocular owner during recovery as well.
      put('E_Close',Math.max(get('E_Close'),blink));
      if(k===0){mode='neutral';id='NEUTRAL';releaseAt=null;}
    }
    commit();
  }
  function reset() {
    if(disposed)return false;
    mode='neutral';id='NEUTRAL';clock=0;releaseAt=null;probe=null;compiled=[];frozen=false;
    clearShadow();values.fill(0);commit();return true;
  }
  function baseline(name) {
    if(disposed||paused||combat)return false;
    if(name==='NEUTRAL')return recover();
    if(!qaRecipes[name]||!legacy.qaSupport(name).available)return false;
    if(amount>0&&amount<.25)throw Error('Baseline intensity must be 0 or .25–1');
    reset();mode='baseline';id=name;
    if(amount===0){mode='neutral';id='NEUTRAL';return true;}
    // Legacy API has a .25 floor. Baseline QA samples below that are not represented as altered recipes.
    if(amount<.25)throw Error('Baseline intensity must be 0 or .25–1');
    legacy.setIntensity(amount);legacy.triggerQA(name);return true;
  }
  function playCandidate(name) {
    if(disposed||paused||combat)return false;
    const spec=R6_CANDIDATES[name];if(!spec)throw Error('Unknown R6 candidate');
    const next=compile(spec);if(next.some(tr=>!nameIndex.has(tr.name))||(recipeFor(spec.source).eyeClosure&&!nameIndex.has('E_Close')))return false;reset();compiled=next;mode='candidate';id=name;return true;
  }
  function recover() {
    if(disposed||combat)return false;
    if(mode==='baseline'||mode==='legacy')return legacy.triggerQA('NEUTRAL');
    if(mode==='neutral')return true;
    releaseWeights.set(values);releaseAt=clock;return true;
  }
  const api={
    support: name=>legacy.support(name),qaSupport: name=>legacy.qaSupport(name),
    playBaseline:baseline,triggerQA:baseline,playCandidate,
    trigger(name,options){if(disposed||combat)return false;if(name==='blink'){if(mode==='restored')reset();return legacy.trigger('blink');}if(name==='neutral')return recover();if(options?.automatic)return false;reset();mode='legacy';return legacy.trigger(name,options);},
    setIntensity(v){if(!Number.isFinite(v)||v<0||v>1)throw Error('Intensity outside 0–1');amount=v;},
    setRegion(region,v){if(!R6_REGIONS.includes(region))throw Error('Unknown facial region');enabled[region]=!!v;if(mode==='candidate'||mode==='probe')evaluate();},
    probe(name,weight){if(disposed||paused||combat)return false;if(!nameIndex.has(name)||!Number.isFinite(weight)||weight<0||weight>1)throw Error('Invalid facial probe');reset();probe={name,weight:clamp(weight,name.startsWith('Pupil_')?PUPIL_CAP:1)};mode='probe';id=name;evaluate();return true;},
    setFrozen(v){frozen=!!v;},
    seek(t){if(!Number.isFinite(t)||t<0||t>12)throw Error('Timeline outside 0–12s');if(mode!=='candidate')return false;clock=t;evaluate();return true;},
    advance(dt,{writeFacial=true}={}){if(!Number.isFinite(dt)||dt<0)throw Error('Invalid dt');if(disposed||paused||frozen||combat||mode==='restored'||!writeFacial||!dt)return;clock+=dt;legacy.advance(dt);evaluate();},
    setPaused(v){paused=!!v;legacy.setPaused(paused);},
    onAnimationEvent(e){if(!combatClip(e.clip))return;if(e.type==='start'){reset();combat=true;}if(e.type==='end'){combat=false;reset();}},
    interruptForCombat(){return recover();},reset,
    restore(){if(disposed||combat)return false;reset();amount=1;for(const region of R6_REGIONS)enabled[region]=true;for(let m=0;m<meshes.length;m++)for(let i=0;i<initial[m].length;i++)meshes[m].morphTargetInfluences[i]=initial[m][i];for(const s of slots){values[s.n]=s.mesh.morphTargetInfluences[s.index];output[names[s.n]]=values[s.n];}mode='restored';if(inspection.weights)Object.assign(inspection.weights,output);return true;},
    dispose(){if(disposed)return;combat=false;api.restore();legacy.dispose();disposed=true;release();},
    report(){return {schema:'shorekeeper.facial-r6/1',status:'R6_ACTING_CANDIDATE',visualQA:'VISUAL_QA_PENDING',appearanceProfile:'APPEARANCE_PROFILE_UNVERIFIED',mode,id,clock,intensity:amount,regions:{...enabled},layers:R6_LAYERS,ownership:facialOwner(inspection),weights:{...output},paused,frozen,combat,writeCount,schedulerR7:false};},
    get state(){const s=legacy.state;return {expression:mode==='candidate'?id:s.expression,id:mode==='candidate'?id:s.id,phase:mode==='candidate'?(releaseAt!==null||clock>3.55?'exit':clock<1.6?'entry':'hold'):s.phase,busy:mode==='candidate'&&clock<6.8||s.busy,blink:s.blink,paused,intensity:amount,weights:output,mode,clock,frozen};}
  };
  return api;
}
