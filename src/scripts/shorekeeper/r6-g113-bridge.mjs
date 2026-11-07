/**
 * Opt-in manual bridge for the already integrated G11.3/S5 stage.
 * G7 is NO_GO; this intentionally does not authorize autonomous facial acting.
 */
export const R6_G113_CANDIDATES=Object.freeze([
 Object.freeze({id:'LITTLE_SMILE_ACTING_R6',label:'Sorriso delicado'}),
 Object.freeze({id:'MY_STAR_ACTING_R6',label:'My Star'}),
 Object.freeze({id:'AFFECT_GROWING_R6',label:'Afeto crescente'}),
 Object.freeze({id:'HELLO_ACTING_R6',label:'Olá'}),
 Object.freeze({id:'TENDERNESS_ACTING_R6',label:'Ternura'}),
 Object.freeze({id:'SERENITY_ACTING_R6',label:'Serenidade'}),
 Object.freeze({id:'WORRIED_FIXED_R6',label:'Preocupação'}),
 Object.freeze({id:'GLANCE_BILATERAL_R6',label:'Olhar bilateral'})
]);
export function resolveR6G113Mode(search=''){
 const query=new URLSearchParams(search);
 const s5=query.get('r61')==='1'&&query.get('r62')==='s5';
 const requested=query.get('r6Stage')==='1';
 return Object.freeze({requested,s5,enabled:requested&&s5,g7AutonomyAllowed:!requested});
}
export function canUseR6G113({enabled=false,canonical=false,model=false,loading=false,contextLost=false,paused=false,inspect=false,presentation='',acting='',combat=false}={}){
 return !!(enabled&&canonical&&model&&!loading&&!contextLost&&!paused&&inspect&&presentation==='contemplation'&&acting==='expressive'&&!combat);
}
