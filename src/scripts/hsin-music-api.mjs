import {youtubeReport,spotifyReport} from './hsin-music-state.mjs';
/** Official SDKs are opt-in and shared. Never call play(), read cross-origin audio, or add an animation loop. */
const loads=new Map();
function sdk(kind){
 if(loads.has(kind))return loads.get(kind);
 const promise=new Promise((resolve,reject)=>{
  const name=kind==='youtube'?'onYouTubeIframeAPIReady':'onSpotifyIframeApiReady',existing=window[name];
  if(kind==='youtube'&&window.YT?.Player){resolve(window.YT);return;}
  let done=false;const finish=(api,error)=>{if(done)return;done=true;clearTimeout(timer);if(window[name]===ready)window[name]=existing;if(error)reject(error);else resolve(api);};
  const ready=api=>{try{existing?.(api);}finally{finish(kind==='youtube'?window.YT:api);}};
  const timer=setTimeout(()=>finish(null,Error('Provider API timeout')),12000);window[name]=ready;
  const script=document.createElement('script');script.src=kind==='youtube'?'https://www.youtube.com/iframe_api':'https://open.spotify.com/embed/iframe-api/v1';script.async=true;script.addEventListener('error',()=>finish(null,Error('Provider API blocked')),{once:true});document.head.append(script);
 });loads.set(kind,promise);promise.catch(()=>loads.delete(kind));return promise;
}
/** Owns the selected provider only. Late SDK callbacks carry the session epoch and cannot revive an old player. */
export function attachMusicAPI({provider,iframe,host,source,controller,token,onFrame=()=>{},load=sdk,interval=setInterval,cancel=clearInterval}){
 let disposed=false,player=null,poll=null,watchdog=null,last=performance.now();
 const report=value=>{if(disposed)return;last=performance.now();controller.observe(token,value);};
 const unavailable=()=>report({status:'unavailable',trackId:null});
 const stop=()=>{if(disposed)return;disposed=true;if(poll!==null)cancel(poll);if(watchdog!==null)cancel(watchdog);player?.destroy?.();};
 load(provider).then(api=>{
  if(disposed)return;
  if(provider==='youtube'){
   player=new api.Player(iframe,{events:{onReady:event=>{if(disposed)return;player=event.target;report(youtubeReport(player,player.getPlayerState()));},onStateChange:event=>{if(!disposed)report(youtubeReport(event.target,event.data));},onError:unavailable}});
   poll=interval(()=>{if(disposed||document.hidden)return;if(!player?.getPlayerState){if(performance.now()-last>12000)unavailable();return;}try{report(youtubeReport(player,player.getPlayerState()));}catch{unavailable();}},500);
  }else{
   // Spotify's official factory creates its own iframe. Do this once on provider selection, never on camera/info changes.
   api.createController(host,{uri:source,width:'100%',height:152},embed=>{
    if(disposed){embed.destroy();return;}player=embed;onFrame(host.querySelector('iframe'));
    embed.addListener('ready',()=>report({status:'ready',trackId:null}));
    embed.addListener('playback_started',event=>report(spotifyReport(event.data,true)));
    embed.addListener('playback_update',event=>report(spotifyReport(event.data)));
   });
  }
  if(provider==='spotify')watchdog=interval(()=>{if(!disposed&&!document.hidden&&performance.now()-last>12000)unavailable();},3000);
 }).catch(()=>{if(!disposed)unavailable();});
 return {dispose:stop};
}
