const OFFICIAL_VIDEO_ID = 'Yhf9ur3xPQA';
const HIGHLIGHT_START_SECONDS = 66; // Aproximação editorial; rever ouvindo o upload oficial.

export function mountHsinSoundtrack(root: HTMLElement): void {
  const toggle = root.querySelector<HTMLButtonElement>('[data-soundtrack-toggle]');
  const panel = root.querySelector<HTMLElement>('#hsin-soundtrack-panel');
  const close = root.querySelector<HTMLButtonElement>('[data-soundtrack-close]');
  const player = root.querySelector<HTMLElement>('[data-soundtrack-player]');
  const placeholder = root.querySelector<HTMLElement>('[data-soundtrack-placeholder]');
  const status = root.querySelector<HTMLElement>('[data-soundtrack-status]');
  const silence = root.querySelector<HTMLButtonElement>('[data-soundtrack-silence]');
  const choices = [...root.querySelectorAll<HTMLButtonElement>('[data-soundtrack-start]')];

  if (!toggle || !panel || !close || !player || !placeholder || !status || !silence) return;

  function stop(message: string): void {
    // Destruir o iframe encerra qualquer reprodução, inclusive ao fechar ou ocultar a aba.
    player!.replaceChildren(placeholder!);
    for (const choice of choices) choice.setAttribute('aria-pressed', 'false');
    status!.textContent = message;
  }

  function setOpen(open: boolean): void {
    panel!.hidden = !open;
    toggle!.setAttribute('aria-expanded', String(open));
    if (!open) stop('Player fechado. Sem reprodução em segundo plano.');
  }

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    setOpen(open);
    if (open) close.focus();
  });

  close.addEventListener('click', () => {
    setOpen(false);
    toggle.focus();
  });

  silence.addEventListener('click', () => stop('Silêncio ativado. Nenhum áudio em reprodução.'));

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
      player!.replaceChildren(iframe);
      for (const option of choices) {
        option.setAttribute('aria-pressed', String(option === choice));
      }
      status!.textContent = seconds > 0
        ? 'Trecho de destaque preparado em aproximadamente 1:06. Use Play no YouTube.'
        : 'Faixa integral preparada. Use Play no YouTube.';
    });
  }

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop('Reprodução encerrada ao sair da aba. Selecione a faixa para retomar.');
  });
  window.addEventListener('pagehide', () => stop('Reprodução encerrada.'), {once: true});
}
