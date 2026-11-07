/** One visible manual menu; existing R6 and historic recipes remain immutable. */
import {R6_G113_CANDIDATES} from './r6-g113-bridge.mjs';
import {FACIAL_VARIANTS,compareFacialVariants} from './facial-variant-catalog.mjs';
import {APPROVED_MANUAL_GESTURES} from './approved-manual-gallery.mjs';

export const R6_PRIMARY_CHOICES=Object.freeze([
 ...R6_G113_CANDIDATES,
 Object.freeze({id:'EYES_WIDE_ACTING_R6',label:'Olhos arregalados · surpresa',status:'VISUAL_QA_PENDING'})
]);
const approved=new Set(APPROVED_MANUAL_GESTURES.map(x=>x.id));
export const R6_HISTORIC_CHOICES=Object.freeze(FACIAL_VARIANTS.map(x=>Object.freeze({
 id:x.id,label:x.label,approvedAppearance:approved.has(x.id),geometry:x.suggestedGeometry,
 timing:x.timing,status:x.status
})));
export const FACE_MENU_VALUES=Object.freeze({
 primary:Object.freeze(R6_PRIMARY_CHOICES.map(x=>Object.freeze({value:'r6:'+x.id,label:x.label}))),
 approved:Object.freeze(R6_HISTORIC_CHOICES.filter(x=>x.approvedAppearance).map(x=>Object.freeze({value:'baseline:'+x.id,label:x.label}))),
 archive:Object.freeze(R6_HISTORIC_CHOICES.filter(x=>!x.approvedAppearance).map(x=>Object.freeze({value:'baseline:'+x.id,label:x.label})))
});
export function resolveFaceMenu(value){
 if(typeof value!=='string')return null;
 if(value.startsWith('r6:')){
  const id=value.slice(3),r=R6_PRIMARY_CHOICES.find(x=>x.id===id);
  return r?Object.freeze({kind:'r6',id,label:r.label}):null;
 }
 if(value.startsWith('baseline:')){
  const id=value.slice(9),r=R6_HISTORIC_CHOICES.find(x=>x.id===id);
  return r?Object.freeze({kind:'baseline',id,label:r.label,geometry:r.geometry,approvedAppearance:r.approvedAppearance}):null;
 }
 return null;
}

/**
 * R5 is the only presentation geometry in the compact manual panel.
 * These pairs differ in historical mouth *geometry*, not in facial recipe
 * weights, requested eye closure or timing; retaining both buttons at R5
 * would render the same recipe twice. Never delete the original recipes.
 */
export const R5_RECIPE_EQUIVALENCES=Object.freeze([
 Object.freeze({archived:'LITTLE_SMILE_R3_CANDIDATE',representedBy:'LITTLE_SMILE_R2_CANDIDATE'}),
 Object.freeze({archived:'HELLO_R3_CLOSED',representedBy:'HELLO_R2_CANDIDATE'})
]);
for(const row of R5_RECIPE_EQUIVALENCES){
 const comparison=compareFacialVariants(row.archived,row.representedBy);
 if(comparison.classification!=='SAME_WEIGHTS_AND_TIMING')
  throw Error('R5 panel deduplication no longer safe: '+row.archived);
}
const archived=new Set(R5_RECIPE_EQUIVALENCES.map(row=>row.archived));
export const R5_FACE_BUTTON_GROUPS=Object.freeze([
 Object.freeze({id:'r6',label:'Atuação anatômica R6',choices:FACE_MENU_VALUES.primary}),
 Object.freeze({id:'approved',label:'Aparências aprovadas · receitas preservadas',choices:FACE_MENU_VALUES.approved}),
 Object.freeze({id:'intermediate',label:'Intermediárias diferentes · V2/R2/R3',choices:Object.freeze(
  FACE_MENU_VALUES.archive.filter(x=>!archived.has(x.value.slice('baseline:'.length)))
 )})
]);
export const R5_FACE_ARCHIVED_IDENTICAL=Object.freeze(
 FACE_MENU_VALUES.archive.filter(x=>archived.has(x.value.slice('baseline:'.length)))
);
export const R5_FACE_BUTTON_COUNT=R5_FACE_BUTTON_GROUPS.reduce((total,group)=>total+group.choices.length,0);
