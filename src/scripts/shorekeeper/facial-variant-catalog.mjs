/** 
 * Traceable, manual-only facial variants. Recipe revision and mouth-geometry
 * revision are distinct dimensions; temporal differences are NOT PSA frames.
 */
import {MOUTH_QA_RECIPES} from './mouth-qa-probes.mjs';

export const MOUTH_GEOMETRY_PROFILES=Object.freeze([
 Object.freeze({id:'canonical',label:'Original · sem correção',status:'BASELINE_SOURCE'}),
 Object.freeze({id:'r2',label:'R2 · ribbon weld',status:'CANDIDATE'}),
 Object.freeze({id:'r3',label:'R3 · interpolação C1',status:'CANDIDATE'}),
 Object.freeze({id:'r4',label:'R4 · contorno + forro',status:'CANDIDATE'}),
 Object.freeze({id:'r5',label:'R5 · borda pele/cavidade corrigida',status:'CANDIDATE'})
]);
const spec=(id,family,label,revision,geometry,notes='')=>Object.freeze({id,family,label,revision,suggestedGeometry:geometry,notes,status:'VISUAL_QA_DEPENDS_ON_GEOMETRY'});
export const FACIAL_VARIANTS=Object.freeze([
 spec('LITTLE_SMILE_V2','little-smile','Sorriso discreto · V2 preservada','V2','r5','Baseline manual; aparência aprovada, perfil geométrico da aprovação não identificado'),
 spec('LITTLE_SMILE_R2_CANDIDATE','little-smile','Esboço de sorriso · R2','R2','r2','Mesmos pesos declarados que R3; malha e renderização podem divergir'),
 spec('LITTLE_SMILE_R3_CANDIDATE','little-smile','Esboço de sorriso · R3','R3','r3','Mesmos pesos declarados que R2; comparação geométrica separada'),
 spec('MY_STAR_V2','my-star','Minha estrela · V2 preservada','V2','r5','Mesmos pesos-base que R2; temporalidade manual V2 difere'),
 spec('MY_STAR_R2_CANDIDATE','my-star','Minha estrela · R2','R2','r2','Mesmos pesos-base que V2; temporização distinta'),
 spec('MY_STAR_R3_CANDIDATE','my-star','Minha estrela · R3 olhos originais','R3','r3','Sem E_Smile bilateral'),
 spec('MY_STAR_R3_EYES_SOFT','my-star','Afeto crescente · R3 olhos suaves','R3 suave','r3','E_Smile_L/R=.1; estado intermediário distinto'),
 spec('HELLO','hello','Olá · original de boca aberta','Original','canonical','M_OpenSmall=.4 e S_02=.32'),
 spec('HELLO_R2_CANDIDATE','hello','Olá · R2 fechada','R2','r2','Mesmos pesos declarados que R3 fechada'),
 spec('HELLO_R3_CLOSED','hello','Olá · R3 fechada','R3 fechada','r3','Mesmos pesos declarados que R2 fechada'),
 spec('HELLO_R3_OPEN','hello','Olá · R3 entreaberta','R3 entreaberta','r3','M_OpenSmall=.08, distinto da versão fechada'),
 spec('LOVE','tenderness','Ternura · LOVE','Base','r5','Correspondência com aparência aprovada ainda requer perfil geométrico'),
 spec('HOPE','serenity','Serenidade · HOPE','Base','r5','Solicita fechamento ocular; preservar E_Close'),
 spec('SURPRISE_SOFT','surprise','Surpresa suave','Base','r5','Receita geométrica preservada'),
 spec('WORRIED','worried','Preocupação (comparativo)','Base','r5','M_Ennui pode duplicar linha oral; preferir candidato R6 corrigido'),
 spec('GLANCE','glance','Olhar lateral (comparativo)','Base','r5','A versão bilateral R6 usa curvas distintas')
].map(row=>{
 const recipe=MOUTH_QA_RECIPES[row.id];
 if(!recipe||!recipe.weights)throw Error('Facial variant missing recipe: '+row.id);
 return Object.freeze({...row,weights:Object.freeze({...recipe.weights}),eyeClosure:recipe.eyeClosure??0,timing:Object.freeze({...recipe.timing})});
}));
export const FACIAL_VARIANT_MAP=Object.freeze(Object.fromEntries(FACIAL_VARIANTS.map(row=>[row.id,row])));
const serialized=o=>JSON.stringify(Object.fromEntries(Object.entries(o??{}).sort(([a],[b])=>a.localeCompare(b))));
export function compareFacialVariants(a,b){
 const left=typeof a==='string'?FACIAL_VARIANT_MAP[a]:a,right=typeof b==='string'?FACIAL_VARIANT_MAP[b]:b;
 if(!left||!right)throw Error('Unknown facial recipe for comparison');
 const weightsEqual=serialized(left.weights)===serialized(right.weights) && left.eyeClosure===right.eyeClosure;
 const timingEqual=serialized(left.timing)===serialized(right.timing);
 return Object.freeze({weightsEqual,timingEqual,geometryEquivalent: left.suggestedGeometry===right.suggestedGeometry,
  classification:weightsEqual&&timingEqual?'SAME_WEIGHTS_AND_TIMING':weightsEqual?'SAME_WEIGHTS_DIFFERENT_TIMING':'DIFFERENT_MORPHS'});
}
