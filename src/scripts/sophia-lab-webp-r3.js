// Each image is a genuine fixed-camera render. Translation only follows the walk.
export const phases = [
  ['write', 3840, 8], ['think', 1840, 8], ['front-to-left', 500, 8],
  ['walk-left', 3840, -8], ['turn-ltr', 875, -8],
  ['walk-right', 3840, 8], ['turn-rtl', 875, 8], ['left-to-front', 500, 8],
];
export function mountLab(el, { reduce, conn }, env = globalThis) {
  const img = el.querySelector('img');
  const guide = el.closest('.lab-companion')?.querySelector('.lab-sophia-guide');
  const size = env.matchMedia('(max-width: 640px)').matches ? 256 : 384;
  const base = '/assets/characters/sophia/lab/r3/sophia-lab-v121-';
  let inView = false, failed = false, running = false, disposed = false;
  let epoch = 0, timer = 0, raf = 0, phase = 0, x = 8, noticePending = false;
  const allowed = () => inView && !env.document.hidden && !reduce.matches && !conn?.saveData && !failed && !disposed;
  const position = value => { x = value; img.style.transform = `translateX(${value}%)`; };
  function stop() {
    epoch++; running = false;
    env.clearTimeout(timer); env.cancelAnimationFrame(raf); timer = raf = 0;
    img.src = el.dataset.still; img.style.transform = ''; phase = 0; x = 8; noticePending = false;
  }
  async function play(index, notice = false) {
    if (!allowed()) return;
    running = true;
    const token = ++epoch;
    const [name, duration, end] = notice ? ['notice', 1120, x] : phases[index];
    const probe = new env.Image(); probe.decoding = 'async';
    // Only the current phase is fetched; no eager download of the animation set.
    const ready = new Promise((resolve, reject) => { probe.onload = resolve; probe.onerror = reject; });
    probe.src = `${base}${name}-${size}-r3.webp`;
    try { await ready; await probe.decode(); }
    catch { if (token === epoch) { failed = true; stop(); } return; }
    if (token !== epoch || !allowed()) return;
    img.src = probe.src; el.dataset.phase = name;
    const start = env.performance.now(), from = x;
    position(from);
    function move(now) {
      if (token !== epoch || !allowed()) return;
      const t = Math.min(1, (now - start) / duration);
      position(from + (end - from) * t);
      if (t < 1 && end !== from) raf = env.requestAnimationFrame(move);
    }
    if (end !== from) raf = env.requestAnimationFrame(move);
    timer = env.setTimeout(() => {
      if (token !== epoch || !allowed()) return;
      env.cancelAnimationFrame(raf); position(end);
      if (notice) { phase = 0; noticePending = false; play(0); }
      else if (noticePending && index === phases.length - 1) play(0, true);
      else { phase = (index + 1) % phases.length; play(phase); }
    }, duration);
  }
  function sync() { if (!allowed()) stop(); else if (!running) play(phase); }
  // Finish the current movement before Notice, so hover cannot cut a turn in half.
  function notice() { if (allowed()) noticePending = true; }
  guide?.addEventListener('pointerenter', notice); guide?.addEventListener('focus', notice);
  function onError() { if (img.getAttribute('src') !== el.dataset.still) { failed = true; stop(); } }
  img.addEventListener('error', onError);
  return {
    visible(value) { inView = value; sync(); }, sync, stop,
    destroy() { disposed = true; stop(); guide?.removeEventListener('pointerenter', notice); guide?.removeEventListener('focus', notice); img.removeEventListener('error', onError); },
  };
}
