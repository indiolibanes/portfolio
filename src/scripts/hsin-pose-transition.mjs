/** One owner of the signature pose; re-target from the currently displayed weight. */
export function createPoseTransition({pose,duration=2.4,invalidate=()=>{}}){
 let weight=0,from=0,target=0,elapsed=0,span=0;
 return {
  request(next){next=Math.max(0,Math.min(1,next));if(next===target)return;from=weight;target=next;elapsed=0;span=duration*Math.abs(target-from);},
  advance(dt){if(weight===target||!Number.isFinite(dt)||dt<=0)return;elapsed+=dt;const t=Math.min(1,elapsed/span),ease=t*t*t*(t*(t*6-15)+10);weight=from+(target-from)*ease;pose.apply(weight);invalidate();},
  reset(){pose.restore();weight=from=target=elapsed=span=0;},
  weight:()=>weight,busy:()=>weight!==target,
 };
}
