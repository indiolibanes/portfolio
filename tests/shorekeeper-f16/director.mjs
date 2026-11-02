/** Isolated prototype: one mixer, partition by actual track binding; source clips untouched. */
export function partition(THREE,body,secondary){
 const b=body.tracks.map(t=>t.name),s=secondary.tracks.map(t=>t.name);
 if(new Set(b).size!==b.length||new Set(s).size!==s.length)throw Error('duplicate tracks');
 const owned=new Set(s);if(s.some(n=>!b.includes(n)))throw Error('unmatched secondary track');
 const mk=(name,tracks)=>new THREE.AnimationClip(name,body.duration,tracks.map(t=>t.clone()),body.blendMode);
 return {body:mk(body.name+'-body',body.tracks.filter(t=>!owned.has(t.name))),baseline:mk(body.name+'-secondary-baseline',body.tracks.filter(t=>owned.has(t.name))),secondary:secondary.clone()};
}
export function createDirector(THREE,root,body,secondary,{enter=.5,transfer=.8,exit=.5,hold=0,mixerFactory=r=>new THREE.AnimationMixer(r)}={}){
 if(![enter,transfer,exit,hold].every(Number.isFinite)||enter<=0||transfer<=0||exit<=0||hold<0)throw Error('invalid timing');
 const clips=partition(THREE,body,secondary),mixer=mixerFactory(root),actions=[clips.body,clips.baseline,clips.secondary].map(c=>mixer.clipAction(c));
 for(const a of actions){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}
 const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x)};
 let phase='idle',clock=0,release=0,releaseWeights=[0,0,0],weights=[0,0,0],queued=false,paused=false,updates=0;
 const set=w=>{weights=w;actions.forEach((a,i)=>a.setEffectiveWeight(w[i]));};
 const begin=()=>{clock=0;phase='run';set([0,0,0]);for(const a of actions)a.reset().setEffectiveWeight(0).play();};
 const end=()=>{for(const a of actions)a.stop();set([0,0,0]);phase='idle';if(queued){queued=false;begin();}};
 const releaseNow=()=>{if(phase==='idle')return;release=0;releaseWeights=[...weights];phase='exit';};
 return {start(){if(phase==='idle')begin();else{queued=true;releaseNow();}},interrupt(){queued=false;releaseNow();},setPaused(v){paused=!!v;},
 advance(dt){if(!Number.isFinite(dt)||dt<0)throw Error('invalid dt');if(paused||phase==='idle'||dt===0)return;
 if(phase==='run'){
 clock+=dt;const gate=smooth(clock/enter),mix=smooth(clock/transfer);set([gate,gate*(1-mix),gate*mix]);
 if(clock>=body.duration+hold){release=0;releaseWeights=[...weights];phase='exit';}
 }else{release+=dt;const k=1-smooth(release/exit);set(releaseWeights.map(w=>w*k));}
 mixer.update(dt);updates++;if(phase==='exit'&&release>=exit)end();
 },dispose(){queued=false;actions.forEach(a=>a.stop());mixer.uncacheRoot(root);phase='idle';},get state(){return {phase,paused,clock,weights:[...weights],updates,queued};},clips};
}
