/**
 * Display-only inventory for the original, private Shorekeeper combat library.
 * It never requests files, exposes R2 keys, changes animation tracks or
 * combines authoring data with visual effects.
 */
export const PRIVATE_COMBAT_BUNDLES=Object.freeze([
  Object.freeze({id:'basic',label:'Ataques básicos',ids:Object.freeze(['SK_ATTACK_01_ORIGINAL','SK_ATTACK_02_ORIGINAL','SK_ATTACK_03_ORIGINAL','SK_ATTACK_04_ORIGINAL'])}),
  Object.freeze({id:'advanced',label:'Movimentos avançados',ids:Object.freeze(['SK_ATTACK_L02_ORIGINAL','SK_SKILL_01_ORIGINAL','SK_SKILL_QTE_01_ORIGINAL','SK_AIR_SKILL_01_ORIGINAL'])}),
  Object.freeze({id:'burst',label:'Resonance Liberation · Bursts',ids:Object.freeze(['SK_BURST_01_ORIGINAL','SK_BURST_02_ORIGINAL'])}),
]);
export function summarizePrivateCombat(manifest,activeClips=[]){
 const known=new Set((activeClips??[]).map(c=>typeof c==='string'?c:c?.name).filter(Boolean));
 const manifestIds=new Set((manifest?.libraries??[]).map(x=>x.id));
 const rows=PRIVATE_COMBAT_BUNDLES.map(group=>{
  const found=group.ids.filter(x=>known.has(x));
  const registered=manifestIds.has(group.id);
  return {id:group.id,label:group.label,registered,loaded:found.length,total:group.ids.length,
   ready:found.length===group.ids.length,
   missing:group.ids.filter(x=>!known.has(x)),
   state:found.length===group.ids.length?'loaded':found.length?'partial':registered?'listed':'absent'};
 });
 return {rows,loaded:rows.reduce((n,x)=>n+x.loaded,0),total:rows.reduce((n,x)=>n+x.total,0),
   allLoaded:rows.every(x=>x.ready),anyRegistered:rows.some(x=>x.registered)};
}
