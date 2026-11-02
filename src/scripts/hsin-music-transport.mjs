/** Local playhead disciplined by provider observations. Playback certainty is distinct from beat-map verification. */
export function verifiedMap(recording){
 return !!recording&&recording.verification?.status==='verified'&&typeof recording.verification.method==='string'&&recording.verification.sources?.some(s=>/^https:\/\//.test(s))&&Number.isFinite(recording.durationSeconds)&&recording.durationSeconds>0&&recording.beats?.length>=2&&recording.beats.every((v,i,a)=>Number.isFinite(v)&&v>=0&&(i===0||v>a[i-1])&&v<=recording.durationSeconds)&&recording.phrases?.length>0&&recording.phrases.every((p,i,a)=>Number.isFinite(p.time)&&p.time>=0&&p.time<recording.durationSeconds&&Number.isFinite(p.seconds)&&p.seconds>0&&(i===0||p.time>a[i-1].time)&&typeof p.phrase==='string');
}
export function createMusicTransport({maps={recordings:[]},now=()=>performance.now()}={}){
 let position=0,correction=0,lastObservation=null,identity=null,revision=0,map=null;
 const out={playing:false,mode:'unavailable',position:0,revision:0,phase:0,region:null,phraseId:null,phraseSeconds:null,intensity:0};
 return {
  advance(dt,state){
   const key=state.provider+':'+state.epoch+':'+state.trackId,changed=key!==identity;
   if(changed){identity=key;position=state.positionSeconds??0;correction=0;revision++;lastObservation=null;map=maps.recordings.find(m=>m.ids?.includes(state.provider+':'+state.trackId)&&verifiedMap(m))??null;}
   if(state.observedAt!==lastObservation&&state.observedAt!==null){lastObservation=state.observedAt;if(state.positionSeconds!==null){const error=state.positionSeconds-position;if(Math.abs(error)>1.25){position=state.positionSeconds;correction=0;revision++;}else correction=error;}}
   out.playing=state.status==='playing'&&state.playbackConfirmed===true&&state.synchronizationQuality!=='unavailable'&&state.observedAt!==null&&now()-state.observedAt<=12000;
   if(out.playing){position+=dt;const fix=Math.max(-dt*.25,Math.min(dt*.25,correction));position+=fix;correction-=fix;}
   position=Math.max(0,position);out.position=position;out.revision=revision;out.mode=out.playing?'ambient':'unavailable';out.region=out.phraseId=out.phraseSeconds=null;out.phase=0;out.intensity=0;
   const compatible=map&&state.synchronizationQuality==='verified'&&state.durationSeconds!==null&&Math.abs(state.durationSeconds-map.durationSeconds)<1;
   if(out.playing&&compatible){
    let marker=null;for(const m of map.phrases){if(m.time>position)break;marker=m;}
    if(marker&&position<=marker.time+marker.seconds){out.mode='mapped';out.region=marker.time;out.phraseId=marker.phrase;out.phraseSeconds=marker.seconds;out.phase=Math.max(0,Math.min(1,(position-marker.time)/marker.seconds));out.intensity=marker.intensity??.3;}
   }
   return out;
  },diagnostics:()=>out,
 };
}
