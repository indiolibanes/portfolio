const OFFICIAL_VIDEO_ID = 'Yhf9ur3xPQA';
const HIGHLIGHT_START_SECONDS = 66; // Marcador editorial provisório; conferir após audição.

type SoundtrackMode = 'closed' | 'selection' | 'docked' | 'expanded';

export function mountHsinSoundtrack(root: HTMLElement): void {
  const toggle = root.querySelector<HTMLButtonElement>('[data-soundtrack-toggle]');
  const panel = root.querySelector<HTMLElement>('#hsin-soundtrack-panel');
  const close = root.querySelector<HTMLButtonElement>('[data-soundtrack-close]');
  const options = root.querySelector<HTMLElement>('[data-soundtrack-options]');
  const optionsToggle = root.querySelector<HTMLButtonElement>('[data-soundtrack-options-toggle]');
  const sideToggle = root.querySelector<HTMLButtonElement>('[data-soundtrack-side-toggle]');
  const player = root.querySelector<HTMLElement>('[data-soundtrack-player]');
  const placeholder = root.querySelector<HTMLElement>('[data-soundtrack-placeholder]');
  const status = root.querySelector<HTMLElement>('[data-soundtrack-status]');
  const silence = root.querySelector<HTMLButtonElement>('[data-soundtrack-silence]');
  const choices = [...root.querySelectorAll<HTMLButtonElement>('[data-soundtrack-start]')];

  if (!toggle || !panel || !close || !options || !optionsToggle || !sideToggle ||
      !player || !placeholder || !status || !silence || choices.length !== 2) return;

  let mode: SoundtrackMode = 'closed';
  let loaded = false;

  const setMode = (next: SoundtrackMode): void => {
    mode = next;
    root.dataset.soundtrackMode = next;
    panel.hidden = next === 'closed';
    toggle.hidden = next !== 'closed';
    options.hidden = next === 'docked';
    player.hidden = !loaded;
    optionsToggle.hidden = !loaded;
    sideToggle.hidden = !loaded;
    toggle.setAttribute('aria-expanded', String(next !== 'closed'));
    optionsToggle.setAttribute('aria-expanded', String(next === 'expanded'));
    optionsToggle.setAttribute('aria-label', next === 'expanded'
      ? 'Recolher opções e manter música'
      : 'Mostrar opções e créditos da música');
  };

  function stop(message: string, next: 'closed' | 'selection' = 'selection'): void {
    // Apenas silêncio, saída da página/aba e fechamento explícito removem o iframe.
    // Recolher opções e movimentar o cenário não interrompem o YouTube.
    player.replaceChildren(placeholder);
    loaded = false;
    choices.forEach(choice => choice.setAttribute('aria-pressed', 'false'));
    status.textContent = message;
    setMode(next);
  }

  toggle.addEventListener('click', () => {
    setMode('selection');
    close.focus();
  });

  close.addEventListener('click', () => {
    stop('Player fechado. Música interrompida.', 'closed');
    toggle.focus();
  });

  optionsToggle.addEventListener('click', () => {
    if (!loaded) return;
    setMode(mode === 'expanded' ? 'docked' : 'expanded');
    // O iframe permanece no mesmo nó DOM: recolher as opções não corta o áudio.
  });

  sideToggle.addEventListener('click', () => {
    const movedLeft = root.dataset.soundtrackSide !== 'left';
    root.dataset.soundtrackSide = movedLeft ? 'left' : 'right';
    sideToggle.setAttribute('aria-label', movedLeft
      ? 'Mover player para a direita' : 'Mover player para a esquerda');
  });

  silence.addEventListener('click', () =>
    stop('Silêncio ativado. Escolha uma faixa para ouvir novamente.'));

  for (const choice of choices) {
    choice.addEventListener('click', () => {
      const seconds = Number(choice.dataset.soundtrackStart);
      if (seconds !== 0 && seconds !== HIGHLIGHT_START_SECONDS) return;

      const iframe = document.createElement('iframe');
      const params = new URLSearchParams({
        rel: '0',
        playsinline: '1',
        autoplay: '0',
        ...(seconds > 0 ? {start: String(seconds)} : {}),
      });
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + OFFICIAL_VIDEO_ID + '?' + params.toString();
      iframe.title = 'Wuthering Waves — Ode to Hsin and Moon (vídeo oficial)';
      iframe.allow = 'encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.loading = 'eager';
      player.replaceChildren(iframe);
      loaded = true;
      choices.forEach(option => option.setAttribute('aria-pressed', String(option === choice)));
      status.textContent = seconds > 0
        ? 'Refrão preparado em aproximadamente 1:06. Dê Play no vídeo; explore a Hsin livremente.'
        : 'Faixa integral preparada. Dê Play no vídeo; explore a Hsin livremente.';
      setMode('docked');
    });
  }

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (mode === 'expanded') {
      setMode('docked');
      optionsToggle.focus();
    } else if (mode === 'selection') {
      stop('Seleção fechada.', 'closed');
      toggle.focus();
    }
    // Escape não desliga a música quando o player está ancorado.
  });

  document.addEventListener('visibilitychange', () => {
    // YouTube não permite um player invisível ou reprodução programática em outra aba.
    if (document.hidden && loaded) {
      stop('A página foi ocultada; a reprodução foi encerrada conforme as regras do YouTube.');
    }
  });
  window.addEventListener('pagehide', () => {
    if (loaded) stop('Reprodução encerrada ao sair da página.');
  }, {once: true});

  setMode('closed');
}
