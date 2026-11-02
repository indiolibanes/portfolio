(() => {
  const TRANSITION_MS = 1680;
  const REDUCED_MS = 380;
  const link = document.querySelector('[data-music-experimental-mode]');
  if (!(link instanceof HTMLAnchorElement)) return;

  const panorama = link.closest('[data-music-panorama]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let running = false;
  let timer = 0;
  let overlay = null;
  let status = null;

  const buildOverlay = () => {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'music-experimental-transition';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = [
      '<span class="music-experimental-transition__veil"></span>',
      '<span class="music-experimental-transition__pulse"></span>',
      '<span class="music-experimental-transition__afterimage"></span>',
      '<span class="music-experimental-transition__slash music-experimental-transition__slash--violet"></span>',
      '<span class="music-experimental-transition__slash music-experimental-transition__slash--blue"></span>',
      '<span class="music-experimental-transition__slash music-experimental-transition__slash--lunar"></span>',
    ].join('');

    const colors = ['#f8f7ff', '#48c9ff', '#8a6cff'];
    for (let i = 0; i < 12; i += 1) {
      const mote = document.createElement('i');
      mote.className = 'music-experimental-transition__mote';
      const angle = (-128 + i * 29) * Math.PI / 180;
      const distance = 68 + (i % 5) * 25;
      mote.style.setProperty('--mote-x', Math.cos(angle) * distance + 'px');
      mote.style.setProperty('--mote-y', Math.sin(angle) * distance + 'px');
      mote.style.setProperty('--mote-delay', 150 + (i % 4) * 55 + 'ms');
      mote.style.setProperty('--mote-size', 2 + (i % 3) + 'px');
      mote.style.setProperty('--mote-color', colors[i % colors.length]);
      overlay.append(mote);
    }

    status = document.createElement('span');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    document.body.append(overlay, status);
    return overlay;
  };

  const cleanup = () => {
    if (timer) window.clearTimeout(timer);
    timer = 0;
    running = false;
    document.documentElement.classList.remove('music-experimental-transition-lock');
    link.removeAttribute('aria-disabled');
    overlay?.remove();
    status?.remove();
    overlay = null;
    status = null;
  };

  const origin = () => {
    const rect = panorama?.getBoundingClientRect();
    if (!rect) return [window.innerWidth * .5, window.innerHeight * .48];
    return [
      rect.left + rect.width * .505,
      rect.top + rect.height * .475,
    ];
  };

  link.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    event.preventDefault();
    if (running) return;
    running = true;

    const target = buildOverlay();
    const [x, y] = origin();
    target.style.setProperty('--origin-x', x + 'px');
    target.style.setProperty('--origin-y', y + 'px');
    target.classList.toggle('is-reduced', reduced.matches);
    document.documentElement.classList.add('music-experimental-transition-lock');
    link.setAttribute('aria-disabled', 'true');
    if (status) status.textContent = 'Abrindo a experiência tridimensional da Hsin.';

    requestAnimationFrame(() => {
      target.classList.add('is-active');
    });

    const duration = reduced.matches ? REDUCED_MS : TRANSITION_MS;
    timer = window.setTimeout(() => {
      window.location.assign(link.href);
    }, duration);
  });

  window.addEventListener('pagehide', cleanup);
})();
