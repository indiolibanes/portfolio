/**
 * S6-E facial repertoire: one semantic family per automatic slot.
 * R6 candidate appearances are newer but NOT automatically certified.
 * Historical approved V2/R3 baselines are preserved in the original gallery.
 * The automatic stage provides ONE visible name for each family, with
 * an explicit approved baseline fallback when a candidate cannot bind.
 */
import {APPROVED_MANUAL_RECIPES} from './approved-manual-gallery.mjs';
import {R6_CANDIDATES} from './anatomical-face.mjs';
export const S6_EXPRESSION_FAMILIES=Object.freeze([
  Object.freeze({family:'small-smile',label:'Sorriso discreto',r6:'LITTLE_SMILE_ACTING_R6',approved:'LITTLE_SMILE_V2'}),
  Object.freeze({family:'star',label:'Minha estrela',r6:'MY_STAR_ACTING_R6',approved:'MY_STAR_V2'}),
  Object.freeze({family:'greeting',label:'Olá',r6:'HELLO_ACTING_R6',approved:'HELLO_R2_CANDIDATE'}),
  Object.freeze({family:'serenity',label:'Serenidade',r6:'SERENITY_ACTING_R6',approved:'HOPE'}),
  Object.freeze({family:'surprise',label:'Surpresa',r6:null,approved:'SURPRISE_SOFT'}),
  Object.freeze({family:'worry',label:'Preocupação',r6:'WORRIED_FIXED_R6',approved:null}),
  Object.freeze({family:'glance',label:'Olhar',r6:'GLANCE_BILATERAL_R6',approved:null}),
]);
export const S6_APPROVED_ARCHIVE=Object.freeze(Object.keys(APPROVED_MANUAL_RECIPES));
export function validateS6ExpressionCatalog(rows=S6_EXPRESSION_FAMILIES){
  if(!Array.isArray(rows)||!rows.length)throw Error('Empty S6 expression catalog');
  const seen=new Set();
  for(const row of rows){
    if(!row?.family||seen.has(row.family))throw Error('Duplicate S6 expression family');
    seen.add(row.family);
    if(row.r6&&!R6_CANDIDATES[row.r6])throw Error('Unknown R6 expression candidate');
    if(row.approved&&!APPROVED_MANUAL_RECIPES[row.approved])throw Error('Unknown approved baseline');
    if(!row.r6&&!row.approved)throw Error('No expression source');
  }
  return rows;
}
/** Faces own their meshes via createAnatomicalFaceDirector; no other writer. */
export function playS6Expression(face,row,{allowExperimental=true}={}){
  if(!face||!row)return {ok:false,source:'UNAVAILABLE'};
  // Try the latest R6 without declaring it visually approved.
  if(allowExperimental&&row.r6&&typeof face.playCandidate==='function'){
    try{if(face.playCandidate(row.r6)===true)return {ok:true,source:'R6_ACTING_CANDIDATE',id:row.r6};}catch{}
  }
  if(row.approved&&typeof face.triggerQA==='function'){
    try{if(face.triggerQA(row.approved)===true)return {ok:true,source:'APPROVED_BASELINE_PROFILE_PENDING',id:row.approved};}catch{}
  }
  return {ok:false,source:'MISSING_MORPHS'};
}
