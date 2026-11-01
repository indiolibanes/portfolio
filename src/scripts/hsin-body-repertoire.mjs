/** A single, seeded stage manager for existing arm actors. No rig names, timers or DOM.
 * The signature solver/transition and chest actor remain the only writers of their chains.
 * Hair and chest share the left arm and can never run together. */
export function createBodyRepertoire({signature,chest,hair=null,breath=null,seed=1,capabilities=()=>({}),onState=()=>{}}){
 let random=seed>>>0,time=0,next=0,state='rest',action=null,last=null,elapsed=0,hold=0,disposed=false;
 const lastAt={};const cooldown={signature:18,chest:38,composition:65,hair:90};
 const rng=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 const range=(a,b)=>a+(b-a)*rng();next=range(5,9);
 const set=s=>{state=s;elapsed=0;onState({state,action,time});};
 const atRest=()=>!signature?.busy()&&(signature?.weight()??0)===0&&!chest?.busy()&&!hair?.busy();
 function returning(){breath?.restore();signature?.request(0);chest?.release();hair?.release();if(state!=='return')set('return');}
 function finish(){last=action;action=null;next=time+range(7,15);set('rest');}
 function choose(context,signatureEnabled,chestEnabled){
  const c=capabilities(),candidates=[];
  if(c.signature&&signatureEnabled)candidates.push(['signature',3]);
  if(c.chest&&chestEnabled)candidates.push(['chest',context==='Warm Presence'?3:1.4]);
  if(c.composition&&c.signature&&c.chest&&signatureEnabled&&chestEnabled)candidates.push(['composition',.9]);
  if(c.hair&&chestEnabled)candidates.push(['hair',.65]);
  let ready=candidates.filter(([name])=>time-(lastAt[name]??-Infinity)>=cooldown[name]);
  if(candidates.length>1)ready=ready.filter(([name])=>name!==last);
  let n=rng()*ready.reduce((s,[,w])=>s+w,0);
  for(const [name,w]of ready){n-=w;if(n<=0)return name;}return null;
 }
 return {
  advance(dt,{enabled=false,allowed=true,context='Neutral Presence',signatureEnabled=true,chestEnabled=true}={}){
   if(disposed)return;if(!Number.isFinite(dt)||dt<0)throw Error('Body dt must be finite and nonnegative.');
   dt=Math.min(.1,dt);time+=dt;elapsed+=dt;
   if((!enabled||!allowed)&&state!=='rest'&&state!=='return')returning();
   signature?.advance(dt);chest?.advance(dt);hair?.advance(dt);
   if(state==='return'){if(atRest())finish();return;}
   if(state==='rest'){
    if(!enabled||!allowed){breath?.restore();return;}
    if(time<next||!atRest()){if(atRest())breath?.advance(dt);return;}
    breath?.restore();
    action=choose(context,signatureEnabled,chestEnabled);if(!action){next=time+range(3,6);breath?.advance(dt);return;}
    lastAt[action]=time;hold=range(3.8,6.5);
    if(action==='signature'||action==='composition'){signature.request(1);set('signature-entry');}
    else{const actor=action==='hair'?hair:chest;if(actor?.start(true,{variant:'plain'}))set('left-acting');else{next=time+5;action=null;}}
   }else if(state==='signature-entry'&&!signature.busy()){
    if(action==='composition'){
     if(chest.start(true,{variant:'composed'}))set('composition');else returning();
    }else set('signature-hold');
   }else if(state==='signature-hold'&&elapsed>=hold)returning();
   else if(state==='left-acting'&&!(action==='hair'?hair:chest)?.busy())returning();
   else if(state==='composition'&&!chest.busy())returning();
   // Guard a missing or broken actor: a finite episode must not pin an arm forever.
   if(state!=='rest'&&state!=='return'&&elapsed>25)returning();
  },
  release(){breath?.restore();if(state!=='rest'||!atRest())returning();},
  reset(){breath?.restore();chest?.cancel();hair?.cancel();signature?.reset();action=null;next=time+range(5,9);set('rest');},
  dispose(){this.reset();disposed=true;},
  busy:()=>state!=='rest',
  diagnostics:()=>({state,action,last,time,next,hold,cooldowns:{...lastAt},disposed}),
 };
}
