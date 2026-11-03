// Exploratory weights only; never an artistic or visual approval.
export const candidates=Object.freeze({
 CANONICAL_SOFT_SMILE:{M_Smile_L:1,M_Smile_R:1,P_M_L_Add:.55,P_M_R_Add:.55,E_Smile_L:.15,E_Smile_R:.15},
 TENDER_GAZE:{Pupil_L:.16,E_Focus:.08,M_Smile_L:.45,M_Smile_R:.45},
 SOFT_SURPRISE:{E_Stare:.18,M_OpenSmall:.25}
});
export const steps=Object.freeze([0,.25,.5,.75,1]);
export function progressive(weights,count=Object.keys(weights).length,amount=1){if(!Number.isInteger(count)||count<0||count>Object.keys(weights).length||!Number.isFinite(amount)||amount<0||amount>1)throw Error('Invalid QA selection');return Object.fromEntries(Object.entries(weights).slice(0,count).map(([n,v])=>{if(!Number.isFinite(v)||v<0||v>1)throw Error('Invalid weight');return [n,v*amount];}));}
