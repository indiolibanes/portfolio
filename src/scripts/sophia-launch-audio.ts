import {R3} from './sophia-immersive-r3-timeline.mjs';
/** Locally hosted CC0 samples, unlocked only by the Start gesture. Never gates GLB loading. */
export function createLaunchAudio(report:(message:string)=>void) {
 let ctx:AudioContext|null=null,master:GainNode,engineBus:GainNode,voiceBus:GainNode,ventBus:GainNode,vent:AudioBufferSourceNode|null=null,engine:AudioBufferSourceNode|null=null,noise:AudioBuffer|null=null;
 let disposed=false,muted=false,failed=false,started=false,wasPaused=false,whooshDone=false,releaseFired=false;
 const buffers=new Map<string,AudioBuffer>(),sources=new Set<AudioBufferSourceNode>(),fired=new Set<number>(),abort=new AbortController();
 const notices=new Set<string>();const notice=(s:string)=>{if(!notices.has(s)){notices.add(s);report(s);}};
 async function load(name:string){try{const response=await fetch('/audio/sophia/launch-r3/'+name+'.mp3',{signal:abort.signal});if(!response.ok)throw Error(String(response.status));const b=await response.arrayBuffer();if(!ctx||disposed)return;const decoded=await ctx.decodeAudioData(b);if(!disposed)buffers.set(name,decoded);}catch(e){if(!disposed){failed=true;notice('Alguns sons não ficaram disponíveis. A viagem continua normalmente.');}}}
 function play(buffer:AudioBuffer,bus:AudioNode,when:number){if(!ctx||disposed)return null;const source=ctx.createBufferSource();source.buffer=buffer;source.connect(bus);sources.add(source);source.onended=()=>{source.disconnect();sources.delete(source);};source.start(Math.max(ctx.currentTime,when));return source;}
 function unlock(){
  if(disposed)return;
  if(!ctx){try{ctx=new AudioContext();master=ctx.createGain();master.gain.value=muted?0:.55;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=8;master.connect(limiter).connect(ctx.destination);engineBus=ctx.createGain();engineBus.gain.value=0;voiceBus=ctx.createGain();engineBus.connect(master);voiceBus.gain.value=.85;voiceBus.connect(master);
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=5000; // Engine bus kept separate from intelligible voice.
    engineBus.disconnect();engineBus.connect(filter).connect(master);
    ventBus=ctx.createGain();ventBus.gain.value=0;const ventFilter=ctx.createBiquadFilter();ventFilter.type='highpass';ventFilter.frequency.value=1600;ventBus.connect(ventFilter).connect(master);
    noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);let seed=4173;const data=noise.getChannelData(0);for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*.5;}
    void Promise.all(['engine','5','4','3','2','1','0'].map(load));
   }catch{failed=true;notice('Áudio indisponível neste navegador; cena silenciosa.');return;}}
  void ctx.resume().catch(()=>notice('Toque em Ativar sons para ouvir o lançamento.'));
  if(!whooshDone&&noise){whooshDone=true;const gain=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.setValueAtTime(350,ctx.currentTime);filter.frequency.exponentialRampToValueAtTime(4000,ctx.currentTime+.8);gain.gain.setValueAtTime(.001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.65);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.95);gain.connect(filter).connect(master);const source=play(noise,gain,ctx.currentTime);if(source)source.onended=()=>{source.disconnect();gain.disconnect();filter.disconnect();sources.delete(source);};}
 }
 function reset(){sources.forEach(s=>{try{s.stop();}catch{}s.disconnect();});sources.clear();engine=null;vent=null;releaseFired=false;fired.clear();started=false;if(ctx)engineBus.gain.setValueAtTime(0,ctx.currentTime);}
 function update(t:number,enginePower:number){if(!ctx||disposed||!started||wasPaused)return;
  if(!engine&&buffers.has('engine')){engine=play(buffers.get('engine')!,engineBus,ctx.currentTime);if(engine){engine.loop=true;engine.loopStart=.12;engine.loopEnd=5.8;}}
  if(!vent&&noise){vent=play(noise,ventBus,ctx.currentTime);if(vent)vent.loop=true;}
  ventBus.gain.setTargetAtTime(t>=R3.reveal&&t<R3.countdown?.08:0,ctx.currentTime,.08);
  if(!releaseFired&&t>=R3.launch){releaseFired=true;if(t<R3.launch+.12&&noise){const gain=ctx.createGain();gain.gain.setValueAtTime(.12,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);gain.connect(master);const snap=play(noise,gain,ctx.currentTime);if(snap)snap.onended=()=>{snap.disconnect();gain.disconnect();sources.delete(snap);};}}
  let duck=false;
  for(let i=0;i<6;i++){const at=R3.countdown+i;if(t>=at-.03&&t<at+.52)duck=true;
   if(fired.has(i)||t<at-.15)continue;
   if(t>at+.10){fired.add(i);continue;} // Late decode/seek never replays old digits.
   const b=buffers.get(String(5-i));if(!b)continue;
   play(b,voiceBus,ctx.currentTime+Math.max(0,at-t));fired.add(i);
  }
  engineBus.gain.setTargetAtTime(enginePower*(duck?.12:.28),ctx.currentTime,.035);
 }
 function pause(value:boolean){wasPaused=value;if(!ctx)return;if(value)void ctx.suspend().catch(()=>{});else void ctx.resume().catch(()=>{});}
 return {unlock,update,pause,reset,start(){started=true;},setMuted(value:boolean){muted=value;if(ctx)master.gain.setTargetAtTime(muted?0:.55,ctx.currentTime,.03);if(!muted)unlock();},get muted(){return muted;},get state(){return {unlocked:!!ctx,context:ctx?.state??'unavailable',muted,failed,loaded:buffers.size};},dispose(){if(disposed)return;disposed=true;abort.abort();reset();buffers.clear();void ctx?.close().catch(()=>{});}};
}
