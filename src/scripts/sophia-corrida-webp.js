// Controla só o que o CSS não resolve: troca o quadro parado pelo ciclo de corrida
// em WebP animado (baixado sob demanda) e liga/desliga o movimento do cenário.
// Nunca solicita 3D: os quadros foram renderizados fora do navegador.
export function mountCorrida(el, { reduce, conn }, env = globalThis) {
  const img = el.querySelector('.corrida__runner');
  const still = img.getAttribute('src');
  const run = img.dataset.run;
  let inView = false, failed = false, running = false, disposed = false, epoch = 0;
  const allowed = () => inView && !env.document.hidden && !reduce.matches && !conn?.saveData && !failed && !disposed;

  function stop() {
    epoch++; running = false;
    el.classList.remove('is-running');
    if (img.getAttribute('src') !== still) img.src = still;
  }

  async function play() {
    running = true;
    const token = ++epoch;
    const probe = new env.Image(); probe.decoding = 'async';
    const ready = new Promise((resolve, reject) => { probe.onload = resolve; probe.onerror = reject; });
    probe.src = run;
    try { await ready; await probe.decode(); }
    catch { if (token === epoch) { failed = true; stop(); } return; }
    if (token !== epoch || !allowed()) return;
    img.src = run;
    el.classList.add('is-running');
  }

  function sync() { if (!allowed()) stop(); else if (!running) play(); }
  img.addEventListener('error', () => { if (img.getAttribute('src') !== still) { failed = true; stop(); } });

  return {
    visible(value) { inView = value; sync(); },
    sync, stop,
    destroy() { disposed = true; stop(); },
  };
}
