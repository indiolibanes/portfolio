/** Experimental channel partition. Does not alter the source clips. */
export function partitionBodyAndSecondary(THREE, body, secondary) {
  const bodyNames = body.tracks.map(t => t.name);
  const secondaryNames = secondary.tracks.map(t => t.name);
  if (new Set(bodyNames).size !== bodyNames.length || new Set(secondaryNames).size !== secondaryNames.length) throw new Error('Duplicate track names require manual review');
  const owned = new Set(secondaryNames);
  const overlap = bodyNames.filter(n => owned.has(n));
  if (!overlap.length || overlap.length !== secondaryNames.length) throw new Error('Unexpected channel ownership; review before composition');
  const result = body.clone();
  result.name = body.name + '_without_secondary';
  result.tracks = result.tracks.filter(t => !owned.has(t.name));
  return {body: result, secondary: secondary.clone(), overlap};
}
/** One shot with smooth envelope; time/hold values require visual calibration. */
export function createOneShot(THREE, mixer, clip, {enter=.3, hold=0, exit=.4}={}) {
  if (![enter,hold,exit].every(x=>Number.isFinite(x)&&x>=0)) throw new Error('Invalid timing');
  const action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce,1); action.clampWhenFinished=true;
  let elapsed=0, running=false;
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  return {
    start(){elapsed=0;running=true;action.reset().setEffectiveWeight(0).play();},
    update(dt){if(!running)return;if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid dt');elapsed+=dt;const weight=(enter?smooth(elapsed/enter):1)*(exit?1-smooth((elapsed-clip.duration-hold)/exit):(elapsed<clip.duration+hold?1:0));action.setEffectiveWeight(weight);mixer.update(dt);if(elapsed>=clip.duration+hold+exit){action.stop();running=false;}},
    stop(){action.stop();running=false;}, get running(){return running;}
  };
}
