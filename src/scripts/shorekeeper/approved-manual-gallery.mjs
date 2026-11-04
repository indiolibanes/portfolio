/**
 * Independent, manual-only gallery. Do NOT conflate artistic review of an
 * appearance with releaseReady, scheduler permission or GLB/geometry sign-off.
 * Source recipes remain unchanged; R6 can add anatomical morphs separately.
 */
import {MOUTH_QA_RECIPES} from './mouth-qa-probes.mjs';
export const APPROVED_MANUAL_GESTURES=Object.freeze([
  {id:'LITTLE_SMILE_V2',label:'Sorriso discreto',hold:1.9,detail:'V2 aprovado; preservar a assimetria e o movimento do queixo'},
  {id:'MY_STAR_V2',label:'Minha estrela',hold:2.3,detail:'V2 aprovado; sorriso amplo e olhos parcialmente fechados'},
  {id:'MY_STAR_R3_EYES_SOFT',label:'Afeto crescente',hold:1.6,detail:'Estado intermediário aprovado, sem substituir Minha estrela'},
  {id:'HELLO_R2_CANDIDATE',label:'Olá',hold:1.6,detail:'Sorriso central; diferente da saudação de boca aberta'},
  {id:'LOVE',label:'Ternura (LOVE)',hold:2,detail:'Receita LOVE visível na bancada como Ternura; confirmar a geometria'},
  {id:'HOPE',label:'Serenidade (HOPE)',hold:2.2,detail:'Receita HOPE exibida como Esperança/Serenidade; confirmar a equivalência'},
  {id:'SURPRISE_SOFT',label:'Surpresa',hold:.9,detail:'Expressão preservada; nenhuma alteração de pesos'},
].map(Object.freeze));
export const APPROVED_MANUAL_RECIPES=Object.freeze(Object.fromEntries(APPROVED_MANUAL_GESTURES.map(({id,hold})=>{
  const source=MOUTH_QA_RECIPES[id];
  if(!source||!source.weights)throw new Error('Approved recipe missing: '+id);
  return [id,Object.freeze({...source,
    timing:Object.freeze({attack:id==='SURPRISE_SOFT'?.35:.75,hold,release:id==='SURPRISE_SOFT'?.85:1.1}),
    review:'HUMAN_APPEARANCE_APPROVED_PROFILE_PENDING',automatic:false})];
})));
export const isApprovedManualGesture=id=>Object.prototype.hasOwnProperty.call(APPROVED_MANUAL_RECIPES,id);
