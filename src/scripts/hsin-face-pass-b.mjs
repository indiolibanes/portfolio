/** Pass B's pure attention and expression directors. No mesh, DOM, or solver ownership. */
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const length=v=>Math.hypot(...v);
const limit=v=>{const n=length(v);return n>.24?v.map(x=>x*.24/n):v;};
function randomSource(seed){let s=seed>>>0;return(a,b)=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return a+(b-a)*s/4294967296;};}

export function createAttentionDirector({seed=1,axes={horizontal:[1,0,0],vertical:[0,1,0]}}={}) {
  const random=randomSource(seed);let state='neutral',elapsed=0,duration=0,cooldown=0,from=[0,0,0],focus=[0,0,0],value=[0,0,0],micro=[0,0,0],nextMicro=.2,lastMode='auto',self=false,idleDue=random(2.8,4.8);
  const transition=(next,to,time)=>{state=next;elapsed=0;from=[...value];focus=[...to];duration=time;micro=[0,0,0];nextMicro=random(.18,.4);};
  return {
    step(dt,input,{closed=false,intensity=.55,mode='auto'}={}){
      if(mode!==lastMode){transition('return',[0,0,0],.45);lastMode=mode;}
      if(mode==='neutral')input=[0,0,0];
      // No saccades or fixation transitions during eyelid closure.
      if(closed)return [...value];
      if(mode==='cursor'){value=mix(value,input,1-Math.exp(-dt/.18));return [...value];}
      elapsed+=dt;cooldown=Math.max(0,cooldown-dt);
      if(length(input)<1e-6&&!self&&state!=='neutral'&&state!=='return')transition('return',[0,0,0],random(.4,.65));
      if(state==='neutral'){
        value=[0,0,0];
        if(length(input)>.0001&&cooldown===0){self=false;transition('acquire',input,random(.14,.22));}
        else if(mode==='auto'&&elapsed>=idleDue&&cooldown===0){
          self=true;const h=random(-.015,.015)*intensity,v=random(-.008,.008)*intensity;
          transition('acquire',axes.horizontal.map((x,i)=>x*h+axes.vertical[i]*v),random(.14,.22));
        }
      }else if(state==='acquire'||state==='avert'){
        value=mix(from,focus,ease(elapsed/duration));
        if(elapsed>=duration){if(state==='acquire')transition('hold',value,random(.55,1.05));else transition('return',[0,0,0],random(.4,.65));}
      }else if(state==='hold'){
        if(elapsed>=nextMicro){const h=random(-.012,.012)*intensity,v=random(-.008,.008)*intensity;micro=axes.horizontal.map((x,i)=>x*h+axes.vertical[i]*v);nextMicro=elapsed+random(.2,.45);}
        value=limit(mix(value,focus.map((v,i)=>v+micro[i]),1-Math.exp(-dt/.035)));
        if(elapsed>=duration){const h=random(-.016,.016)*intensity;const away=focus.map((v,i)=>v*.32+axes.horizontal[i]*h);transition('avert',away,random(.16,.25));}
      }else if(state==='return'){
        // Horizontal and vertical settle on different clocks; both eyes remain conjugate.
        const h=dot(from,axes.horizontal)*(1-ease(elapsed/(duration*.72)));
        const v=dot(from,axes.vertical)*(1-ease(elapsed/duration));
        value=axes.horizontal.map((x,i)=>x*h+axes.vertical[i]*v);
        if(elapsed>=duration){state='neutral';value=[0,0,0];elapsed=0;cooldown=random(1.2,2.8);self=false;idleDue=random(2.8,5.5);}
      }
      return limit(value).map(v=>Math.abs(v)<1e-7?0:v);
    },
    reset(){state='neutral';elapsed=0;value=[0,0,0];self=false;cooldown=.2;},
    diagnostics(){return {state,elapsed,duration,cooldown,value:[...value]};},
  };
}

export function createExpressionDirector({seed=2,limits={}}={}){
  const random=randomSource(seed);let time=0,next=random(5,9),beat=null,lab=null,body=0,bodyTarget=0,winkRequested=false;
  const cap=(name,value)=>Math.min(limits[name]??0,Math.max(0,(limits[name]??0)*value));
  const envelope=(t,entry,hold,exit)=>t<entry?ease(t/entry):t<entry+hold?1:1-ease((t-entry-hold)/exit);
  function begin(kind,manual=false){if(beat||lab)return false;beat={kind,start:time,side:random(0,1)<.76?'R':'L',wink:!manual&&kind==='smile'&&random(0,1)<.23,manual};winkRequested=false;return true;}
  return {
    signal(event){if(event==='gesture:prepare')bodyTarget=.65;else if(event==='gesture:hold')bodyTarget=1;else if(event==='gesture:release')bodyTarget=0;},
    testMorph(name){if(beat||lab||!(limits[name]>0))return false;lab={name,start:time};return true;},
    testBeat(kind){return ['smile','nose-smile'].includes(kind)&&begin(kind,true);},
    isLab(){return !!lab||!!beat?.manual;},
    step(dt,{intensity=.55,enabled=true,closed=false}={}){
      time+=dt;body+=(bodyTarget-body)*(1-Math.exp(-dt/.65));
      if(lab){const t=time-lab.start,e=envelope(t,.55,.35,.65),name=lab.name;
        const output={smileR:0,smileL:0,overlays:{},isolated:true,wink:false};
        if(name==='M_Smile_R')output.smileR=cap(name,e*intensity);else if(name==='M_Smile_L')output.smileL=cap(name,e*intensity);else output.overlays[name]=cap(name,e*intensity);
        if(t>=1.55){lab=null;next=time+random(6,12);}return output;
      }
      if(!beat&&enabled&&body<.02&&bodyTarget===0&&time>=next)begin('smile');
      let e=0,side='R',nose=0,wink=false;
      if(beat){const t=time-beat.start;e=envelope(t,.85,.8,1.15);side=beat.side;
        // Nose is reachable ONLY through an explicit author test, never the autonomous calendar.
        if(beat.kind==='nose-smile'&&beat.manual)nose=envelope(Math.max(0,t-.65),.3,.18,.5);
        if(beat.wink&&!winkRequested&&t>=1.05&&!closed){wink=true;winkRequested=true;}
        if(t>=2.8){beat=null;next=time+random(7,15);}
      }
      const expressive=(enabled||beat?.manual)?e*intensity:0;
      const support=enabled&&!beat?.manual?body*.72*intensity:0;
      const right=Math.max(side==='R'?expressive:0,support),left=side==='L'?expressive:0;
      return {smileR:Math.max(expressive*(side==='R'?1:.24),support)*.12,
        smileL:Math.max(expressive*(side==='L'?1:.18),support*.18)*.12,
        overlays:{B_Up_Add_R:cap('B_Up_Add_R',right*.65),B_Up_Add_L:cap('B_Up_Add_L',left*.65),
          E_Smile_R:cap('E_Smile_R',right*.30),E_Smile_L:cap('E_Smile_L',left*.30),
          E_Squint_R:cap('E_Squint_R',right*.18),E_Squint_L:cap('E_Squint_L',left*.18),
          P_Nose_Up:cap('P_Nose_Up',nose*intensity)},isolated:!!beat?.manual,wink};
    },
    diagnostics(){return {time,next,beat:beat?{...beat}:null,lab:lab?{...lab}:null,body,bodyTarget};},
  };
}
