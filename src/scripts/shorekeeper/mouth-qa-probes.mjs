import {RECIPES} from './shorekeeper-face-expressions.mjs';
/** Baseline controls, NOT recovered V2 smiles. No new weight recipe is asserted without WebGL evidence. */
export const MOUTH_QA_PROBES=Object.freeze({
 LITTLE_SMILE_V2:Object.freeze({...RECIPES.LITTLE_SMILE,status:'B_VISUAL_QA_PENDING',purpose:'BASELINE_CONTROL_NOT_RECOVERY',source:'LITTLE_SMILE',timing:{attack:.3,hold:3600,release:.5}}),
 MY_STAR_V2:Object.freeze({...RECIPES.MY_STAR,status:'B_VISUAL_QA_PENDING',purpose:'BASELINE_CONTROL_NOT_RECOVERY',source:'MY_STAR',timing:{attack:.3,hold:3600,release:.5}}),
 ...Object.fromEntries(['M_Smile_L','M_Smile_R','P_M_L_Add','P_M_R_Add','M_OpenSmall','P_M_ZL_Add','P_M_ZR_Add'].map(name=>['ISOLATE_'+name,Object.freeze({weights:Object.freeze({[name]:1}),status:'B_VISUAL_QA_PENDING',purpose:'UNIT_BASIS_PROBE',timing:{attack:.3,hold:3600,release:.5}})]))
});
/**
 * R2 candidates. They are only meaningful with the runtime ribbon weld (?mouthR2=1); on the canonical
 * geometry the same weights reproduce the detached-filament defect. Never promoted without human review.
 * HELLO_R2 drops M_OpenSmall: hello.gif (0.8-3.97 s) shows a closed smile and the open-mouth morph
 * detaches an arc above the stroke.
 */
const r2=(weights,timing)=>Object.freeze({weights:Object.freeze(weights),status:'B_SMILE_VISUAL_CANDIDATE',purpose:'R2_CANDIDATE',requiresWeld:true,timing:{attack:1,hold:3600,release:.9,...timing}});
export const MOUTH_R2_CANDIDATES=Object.freeze({
 LITTLE_SMILE_R2_CANDIDATE:r2({M_Smile_L:.6,M_Smile_R:.6,P_M_L_Add:.5,P_M_R_Add:.5,C_ZL_Face:.5,C_ZR_Face:.5}),
 MY_STAR_R2_CANDIDATE:r2({M_Smile_L:1,M_Smile_R:1,P_M_L_Add:1,P_M_R_Add:1,E_Smile_L:.25,E_Smile_R:.25,C_ZL_Face:1,C_ZR_Face:1}),
 HELLO_R2_CANDIDATE:r2({M_Smile_L:.7,M_Smile_R:.7,P_M_L_Add:.6,P_M_R_Add:.6,E_Smile_L:.15,E_Smile_R:.15})
});
export const MOUTH_QA_RECIPES=Object.freeze({...RECIPES,...MOUTH_QA_PROBES,...MOUTH_R2_CANDIDATES});
