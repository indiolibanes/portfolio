/** One visible manual menu; existing R6 and historic recipes remain immutable. */
import {R6_G113_CANDIDATES} from './r6-g113-bridge.mjs';
import {FACIAL_VARIANTS} from './facial-variant-catalog.mjs';
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
