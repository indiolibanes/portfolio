import {RECIPES} from './shorekeeper-face-expressions.mjs';
/** Baseline controls, NOT recovered V2 smiles. No new weight recipe is asserted without WebGL evidence. */
export const MOUTH_QA_PROBES=Object.freeze({
 LITTLE_SMILE_V2:Object.freeze({...RECIPES.LITTLE_SMILE,status:'B_VISUAL_QA_PENDING',purpose:'BASELINE_CONTROL_NOT_RECOVERY',source:'LITTLE_SMILE',timing:{attack:.3,hold:3600,release:.5}}),
 MY_STAR_V2:Object.freeze({...RECIPES.MY_STAR,status:'B_VISUAL_QA_PENDING',purpose:'BASELINE_CONTROL_NOT_RECOVERY',source:'MY_STAR',timing:{attack:.3,hold:3600,release:.5}}),
 ...Object.fromEntries(['M_Smile_L','M_Smile_R','P_M_L_Add','P_M_R_Add','M_OpenSmall','P_M_ZL_Add','P_M_ZR_Add'].map(name=>['ISOLATE_'+name,Object.freeze({weights:Object.freeze({[name]:1}),status:'B_VISUAL_QA_PENDING',purpose:'UNIT_BASIS_PROBE',timing:{attack:.3,hold:3600,release:.5}})]))
});
export const MOUTH_QA_RECIPES=Object.freeze({...RECIPES,...MOUTH_QA_PROBES});
