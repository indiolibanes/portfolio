/**
 * A short, deterministic little comedy on /404:
 * rush in -> button-mashing -> frustration -> throw -> storm off -> empty room.
 * DOM/CSS only. No WebGL, no new game rules, no frame-by-frame React state.
 */
const durations = {
  enter: 1250,
  play: 2750,
  stress: 1150,
  throw: 820,
  leave: 1600,
  empty: 1100,
};
const sequence = Object.keys(durations);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const saver = navigator.connection?.saveData === true;
const quiet = () => document.documentElement.dataset.seriousMode === 'true'
  || document.documentElement.dataset.legacyMode === 'true';

for (const root of document.querySelectorAll('[data-sophia-room2d]')) {
  let index = 0;
  let remaining = durations.enter;
  let startedAt = 0;
  let timer = 0;
  let visible = false;
  let disposed = false;
  const shouldRun = () => visible && !document.hidden && !reduced.matches && !saver && !quiet();

  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
      remaining = Math.max(20, remaining - (performance.now() - startedAt));
    }
    root.dataset.running = 'false';
  }
  function next() {
    timer = 0;
    index = (index + 1) % sequence.length;
    remaining = durations[sequence[index]];
    root.dataset.phase = sequence[index];
    if (shouldRun()) start();
  }
  function start() {
    if (timer || disposed || !shouldRun()) return;
    root.dataset.running = 'true';
    if (!root.dataset.started) {
      root.dataset.started = 'true';
      index = 0;
      remaining = durations.enter;
      root.dataset.phase = 'enter';
    }
    startedAt = performance.now();
    timer = setTimeout(next, remaining);
  }
  function sync() {
    if (shouldRun()) start();
    else {
      stop();
      if (reduced.matches || saver || quiet()) root.dataset.phase = 'play';
    }
  }

  const observer = new IntersectionObserver((entries) => {
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  }, {rootMargin: '80px 0px', threshold: .08});
  observer.observe(root);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener?.('change', sync);
  const modeObserver = new MutationObserver(sync);
  modeObserver.observe(document.documentElement, {attributes:true,attributeFilter:['data-serious-mode','data-legacy-mode']});
  window.addEventListener('pagehide', () => {
    disposed = true;
    stop();
    observer.disconnect();
    modeObserver.disconnect();
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener?.('change', sync);
  }, {once:true});
}
