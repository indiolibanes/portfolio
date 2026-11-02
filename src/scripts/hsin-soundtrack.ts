import {musicEmbed} from './hsin-music-providers.mjs';
type Provider = 'none' | 'youtube' | 'spotify';

/** Keep one live iframe in place across camera changes and information toggles. */
export function mountHsinSoundtrack(root: HTMLElement): void {
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
  let provider: Provider = 'none';
  let start = 0;
  const layout = () => stage.dispatchEvent(new CustomEvent('hsin:tower-layout'));
  const observe = new ResizeObserver(() => {
    stage.style.setProperty('--tower-reserved-height', `${Math.ceil(root.offsetHeight) + 18}px`);
    layout();
  });
  observe.observe(root);

  function choose(next: Provider, seconds = 0) {
    // Re-selecting the active source must not reset the native playback session.
    if (provider === next && (next !== 'youtube' || start === seconds)) {
      if (next === 'none') root.dataset.towerState = 'no-music-fallback';
      return;
    }
    provider = next;
    start = seconds;
    root.dataset.provider = next;
    root.dataset.towerState = next === 'none' ? 'no-music-fallback' : `${next}-active`;
    root.dataset.infoExpanded = 'false';
    options.hidden = true;
    info.setAttribute('aria-expanded', 'false');
    const embed = musicEmbed(next, seconds);
    if (!embed) {
      // Removing the previous iframe stops that provider before another can play.
      player.replaceChildren(placeholder);
      status.textContent = 'Sem música. O farol permanece aceso.';
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
      status.textContent = next === 'spotify' ? 'Álbum preparado. Use o Play do Spotify.'
        : seconds ? 'Refrão preparado em ≈ 1:06. Use o Play do YouTube.' : 'Faixa preparada. Use o Play do YouTube.';
    }
    layout();
  }
  buttons.forEach(button => {
    button.addEventListener('focus', () => {
      if (root.dataset.towerState === 'idle') root.dataset.towerState = 'provider-selection';
    });
    button.addEventListener('click', () => {
      const next = button.dataset.musicProvider;
      if (next !== 'none' && next !== 'youtube' && next !== 'spotify') return;
      choose(next);
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-soundtrack-start]').forEach(button => {
    button.addEventListener('click', () => {
      const seconds = Number(button.dataset.soundtrackStart);
      if (seconds !== 0 && seconds !== 66) return;
      choose('youtube', seconds);
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.musicProvider === 'youtube')));
      info.focus();
    });
  });
  info.addEventListener('click', () => {
    options.hidden = !options.hidden;
    root.dataset.infoExpanded = String(!options.hidden);
    info.setAttribute('aria-expanded', String(!options.hidden));
    // Options live after the video; expanding them never replaces/hides the iframe.
    layout();
  });
  side.addEventListener('click', () => {
    const left = root.dataset.soundtrackSide !== 'left';
    root.dataset.soundtrackSide = left ? 'left' : 'right';
    side.setAttribute('aria-label', left ? 'Mover farol para a direita' : 'Mover farol para a esquerda');
    layout();
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !options.hidden) {
      options.hidden = true;
      root.dataset.infoExpanded = 'false';
      info.setAttribute('aria-expanded', 'false');
      info.focus();
      layout();
    }
  });
  const silence = (message: string) => {
    if (provider === 'none') return;
    choose('none');
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.musicProvider === 'none')));
    status.textContent = message;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) silence('Página oculta. Escolha o provedor para retomar.');
  });
  // A narrow, scrollable viewport must not leave a background YouTube player.
  const playerVisibility = new IntersectionObserver(entries => {
    if (provider === 'youtube' && (entries[0]?.intersectionRatio ?? 0) < .5) {
      silence('Vídeo fora da área visível. Escolha YouTube para retomar.');
    }
  }, {threshold:[0,.5]});
  playerVisibility.observe(player);
  window.addEventListener('pagehide', () => silence('Reprodução encerrada ao sair da página.'));
  // Kept across bfcache restoration: nodes and observers are still valid there.
  layout();
}
