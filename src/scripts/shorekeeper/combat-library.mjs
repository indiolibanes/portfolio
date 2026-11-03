/** Combat source and channel ownership must be verified before any clip becomes available. */
export const COMBAT_IDS=Object.freeze(['SK_ATTACK_01_ORIGINAL','SK_ATTACK_02_ORIGINAL','SK_ATTACK_03_ORIGINAL','SK_ATTACK_04_ORIGINAL']);
export function createCombatLibrary(){
 let disposed=false;
 return {
  playAttack(id){if(disposed)throw Error('Combat library disposed');if(!COMBAT_IDS.includes(id))throw Error('Unknown combat clip');return {ok:false,reason:'SOURCE_ASSETS_BLOCKED',id};},
  pause(){},resume(){},interrupt(){},recover(){},
  getState(){return {status:disposed?'DISPOSED':'SOURCE_ASSETS_BLOCKED',active:null,clips:COMBAT_IDS.map(id=>({id,available:false,source:null,duration:null,tracks:null,ownership:'UNVERIFIED',rib:'UNVERIFIED',qa:'BLOCKED'}))};},
  dispose(){disposed=true;}
 };
}
