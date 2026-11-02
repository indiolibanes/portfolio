import {musicEmbed} from './hsin-music-providers.mjs';
import {musicForStage} from './hsin-music-state.mjs';
import {attachMusicAPI} from './hsin-music-api.mjs';
type Provider = 'none' | 'youtube' | 'spotify';

/** Keep one live iframe in place across camera changes and information toggles. */
export function mountHsinSoundtrack(root: HTMLElement) {
  if (root.dataset.musicMounted) return;
  root.dataset.musicMounted = 'true';
  const stage = root.closest<HTMLElement>('[data-hsin-stage]');
  const player = root.querySelector<HTMLElement>('[data-soundtrack-player]');
  const placeholder = root.querySelector<HTMLElement>('[data-soundtrack-placeholder]');
  const status = root.querySelector<HTMLElement>('[data-soundtrack-status]');
  const options = root.querySelector<HTMLElement>('[data-soundtrack-options]');
  const info = root.querySelector<HTMLButtonElement>('[data-soundtrack-options-toggle]');
  const side = root.querySelector<HTMLButtonElement>('[data-soundtrack-side-toggle]');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-music-provider]')];
  if (!player || !placeholder || !status || !options || !info || !side || !stage) return;
  const life = new AbortController(), session = musicForStage(stage);
  let observerAPI = {dispose() {}}, disposed = false, lastStatus = '';
  const unsubscribe = session.subscribe(state => {
    const key = state.provider + ':' + state.status; if (key === lastStatus) return; lastStatus = key;
    root.dataset.playbackState = state.status;
    const labels = {ready:'Player preparado. Use o Play do provedor.',playing:state.provider==='youtube'?'YouTube em reprodução · dança livre disponível com atuação ativa.':'Spotify em reprodução · apenas escuta.',paused:'Música pausada.',buffering:'Aguardando a música carregar.',ended:'A música terminou.',unavailable:'Estado do player indisponível. A Hsin permanece contemplativa.',no_music:'Sem música. O pavilhão permanece aceso.'};
    status.textContent = labels[state.status];
  });
  let provider: Provider = 'none';
  let start = 0;
  const layout = () => stage.dispatchEvent(new CustomEvent('hsin:tower-layout'));
  const observe = new ResizeObserver(() => {
    stage.style.setProperty('--tower-reserved-height', `${Math.ceil(root.offsetHeight) + 18}px`);
    layout();
  });
  observe.observe(root);

  function choose(next: Provider, seconds = 0) {
    if (disposed) return;
    // Re-selecting the active source must not reset the native playback session.
    if (provider === next && (next !== 'youtube' || start === seconds)) {
      if (next === 'none') root.dataset.towerState = 'no-music-fallback';
      return;
    }
    observerAPI.dispose(); const token = session.select(next);
    provider = next;
    start = seconds;
    root.dataset.provider = next;
    root.dataset.towerState = next === 'none' ? 'no-music-fallback' : `${next}-active`;
    root.dataset.infoExpanded = 'false';
    options.hidden = true;
    info.setAttribute('aria-expanded', 'false');
    const embed = musicEmbed(next, seconds, typeof location === 'object' ? location.origin : null);
    if (!embed) {
      // Removing the previous iframe stops that provider before another can play.
      player.replaceChildren(placeholder);
      status.textContent = 'Sem música. O pavilhão permanece aceso.';
    } else {
      const iframe = document.createElement('iframe');
      iframe.src = embed.src;
      iframe.title = embed.title;
      iframe.allow = embed.allow;
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.loading = 'eager';
      iframe.height = String(embed.height);
      player.replaceChildren(iframe);
      observerAPI = attachMusicAPI({provider:next, iframe, host:iframe, source:'spotify:album:0l7zzxlw0HfvGYAJiiWU2F', controller:session, token, onFrame:() => { const native = player.querySelector('iframe'); if(native){native.title=embed.title;native.referrerPolicy='strict-origin-when-cross-origin';} layout(); }});
      status.textContent = next === 'spotify' ? 'Álbum preparado. Use o Play do Spotify.'
        : seconds ? 'Trecho preparado em ≈ 1:06. Use o Play do YouTube.' : 'Faixa preparada. Use o Play do YouTube.';
    }
    layout();
  }
  buttons.forEach(button => {
    button.addEventListener('focus', () => {
      if (root.dataset.towerState === 'idle') root.dataset.towerState = 'provider-selection';
    }, {signal:life.signal});
    button.addEventListener('click', () => {
      const next = button.dataset.musicProvider;
      if (next !== 'none' && next !== 'youtube' && next !== 'spotify') return;
      choose(next);
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }, {signal:life.signal});
  });
  root.querySelectorAll<HTMLButtonElement>('[data-soundtrack-start]').forEach(button => {
    button.addEventListener('click', () => {
      const seconds = Number(button.dataset.soundtrackStart);
      if (seconds !== 0 && seconds !== 66) return;
      choose('youtube', seconds);
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.musicProvider === 'youtube')));
      info.focus();
    }, {signal:life.signal});
  });
  info.addEventListener('click', () => {
    options.hidden = !options.hidden;
    root.dataset.infoExpanded = String(!options.hidden);
    info.setAttribute('aria-expanded', String(!options.hidden));
    // Options live after the video; expanding them never replaces/hides the iframe.
    layout();
  }, {signal:life.signal});
  side.addEventListener('click', () => {
    const left = root.dataset.soundtrackSide !== 'left';
    root.dataset.soundtrackSide = left ? 'left' : 'right';
    side.setAttribute('aria-label', left ? 'Mover pavilhão para a direita' : 'Mover pavilhão para a esquerda');
    layout();
  }, {signal:life.signal});
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !options.hidden) {
      options.hidden = true;
      root.dataset.infoExpanded = 'false';
      info.setAttribute('aria-expanded', 'false');
      info.focus();
      layout();
    }
  }, {signal:life.signal});
  const silence = (message: string) => {
    if (provider === 'none') return;
    choose('none');
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.musicProvider === 'none')));
    status.textContent = message;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) silence('Página oculta. Escolha o provedor para retomar.');
  }, {signal:life.signal});
  // A narrow, scrollable viewport must not leave a background YouTube player.
  const playerVisibility = new IntersectionObserver(entries => {
    if (provider === 'youtube' && (entries[0]?.intersectionRatio ?? 0) < .5) {
      silence('Vídeo fora da área visível. Escolha YouTube para retomar.');
    }
  }, {threshold:[0,.5]});
  playerVisibility.observe(player);
  function dispose() {
    if (disposed) return; silence('Reprodução encerrada ao sair da página.'); disposed = true; observerAPI.dispose(); unsubscribe(); life.abort(); observe.disconnect(); playerVisibility.disconnect(); delete root.dataset.musicMounted;
  }
  window.addEventListener('pagehide', () => {dispose(); window.addEventListener('pageshow', event => {if(event.persisted)mountHsinSoundtrack(root);}, {once:true});}, {once:true,signal:life.signal});
  layout();
  return {dispose};
}
