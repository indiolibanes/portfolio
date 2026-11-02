/** Official embeds only. No player SDK, authentication token or local audio. */
export const SOUNDTRACK = Object.freeze({
  video: 'Yhf9ur3xPQA',
  highlight: 66,
  spotifyAlbum: '0l7zzxlw0HfvGYAJiiWU2F',
  youtube: 'https://www.youtube.com/watch?v=Yhf9ur3xPQA',
  spotify: 'https://open.spotify.com/album/0l7zzxlw0HfvGYAJiiWU2F',
});
export function musicEmbed(provider, start = 0) {
  if (provider === 'youtube') {
    const seconds = start === SOUNDTRACK.highlight ? start : 0;
    const params = new URLSearchParams({rel:'0', playsinline:'1', autoplay:'0', ...(seconds ? {start:String(seconds)} : {})});
    return {src:'https://www.youtube-nocookie.com/embed/'+SOUNDTRACK.video+'?'+params,
      title:'Wuthering Waves — Ode to Hsin and Moon (YouTube oficial)',
      allow:'encrypted-media; picture-in-picture; fullscreen', height:200};
  }
  if (provider === 'spotify') return {
    src:'https://open.spotify.com/embed/album/'+SOUNDTRACK.spotifyAlbum+'?utm_source=generator&theme=0',
    title:'Ode to Hsin and Moon — álbum oficial no Spotify',
    allow:'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture', height:152,
  };
  return null;
}
