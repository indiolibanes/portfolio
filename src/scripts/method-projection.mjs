// Duração acumulada dos 135 quadros da atuação original, em milissegundos.
// A posição dos quadros nos WebPs segue esta mesma ordem, por linhas.
const frameEnds = [
  111, 222, 333, 389, 445, 501, 612, 723, 834, 945, 1278, 1389, 1500, 1611, 1722, 1833, 1944,
  2015, 2086, 2157, 2228, 2299, 2370, 2441, 2512, 2583, 2654, 2725, 2925, 3125, 3325, 3436, 3547,
  3658, 3769, 3880, 3991, 4102, 4245, 4388, 4531, 4674, 4841, 5008, 5119, 5230, 5341, 5452, 5563,
  5674, 5785, 5896, 6229, 6562, 6687, 6812, 6937, 7062, 7395, 7728, 8061, 8394, 8727, 8783, 8839,
  8895, 9228, 9561, 9894, 10227, 10338, 10449, 10560, 10671, 10782, 10893, 11226, 11559, 11892,
  12225, 12350, 12475, 12600, 12725, 12850, 13183, 13516, 13849, 14182, 14238, 14294, 14627,
  14960, 15293, 15404, 15515, 15626, 15737, 15848, 15959, 16292, 16403, 16514, 16625, 16736,
  16847, 16958, 17029, 17100, 17171, 17242, 17313, 17384, 17455, 17526, 17597, 17668, 17739,
  17939, 18139, 18250, 18361, 18472, 18583, 18694, 18805, 18916, 19027, 19170, 19313, 19456,
  19599, 19766, 19933, 20000,
];
const sceneDuration = 20000;
const phaseDuration = 5000;
const columns = 7;
const framesPerSheet = columns * 7;
const sheets = [0, 1, 2].map(index => `/images/sophia/method-projection-poses-${index}.webp`);

export function sampleMethodProjection(elapsed) {
  const time = Math.max(0, elapsed) % sceneDuration;
  // Upper bound: a frame ends at its exclusive endpoint.
  let low = 0;
  let high = frameEnds.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (frameEnds[middle] <= time) low = middle + 1;
    else high = middle;
  }
  const phase = Math.floor(time / phaseDuration) + 1;
  const tile = low % framesPerSheet;
  return {
    frame: low,
    phase,
    link: time % phaseDuration >= phaseDuration / 2 ? phase : 0,
    sheet: Math.floor(low / framesPerSheet),
    column: tile % columns,
    row: Math.floor(tile / columns),
  };
}

export function mountMethodProjection(figure, env = globalThis) {
  const poses = figure.querySelector('.method-presenter__poses');
  if (!poses) return () => {};
  const preference = env.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = env.navigator.connection;
  const canPlay = () => figure.dataset.motionPlaying === 'true' &&
    !preference.matches && !connection?.saveData && !env.document.hidden && !pageAway;
  let raf = null;
  let loading = null;
  let wanted = false;
  let version = 0;
  let pageAway = false;
  let lastFrame = -1;
  let lastSheet = -1;
  let lastPhase = 0;
  let lastLink = -1;
  let start;

  function show(now) {
    start ??= now;
    const { frame, phase, link, sheet, column, row } = sampleMethodProjection(now - start);
    if (phase !== lastPhase) figure.dataset.methodPhase = String(lastPhase = phase);
    if (link !== lastLink) figure.dataset.methodLink = String(lastLink = link);
    if (sheet !== lastSheet) {
      poses.style.backgroundImage = `url("${sheets[sheet]}")`;
      lastSheet = sheet;
    }
    if (frame !== lastFrame) {
      poses.style.backgroundPosition = `${column * 100 / (columns - 1)}% ${row * 100 / 6}%`;
      lastFrame = frame;
    }
    if (figure.dataset.methodPlaying !== 'true') figure.dataset.methodPlaying = 'true';
    raf = env.requestAnimationFrame(show);
  }

  function stop() {
    version++;
    wanted = false;
    if (raf !== null) env.cancelAnimationFrame(raf);
    raf = null;
    start = undefined;
    figure.removeAttribute('data-method-playing');
    figure.removeAttribute('data-method-link');
    figure.dataset.methodPhase = '1';
    lastPhase = 0;
    lastLink = -1;
  }

  async function sync() {
    if (!canPlay()) {
      if (wanted) stop();
      return;
    }
    if (wanted) return;
    wanted = true;
    const token = ++version;
    loading ??= Promise.all(sheets.map(async url => {
      const image = new env.Image();
      image.src = url;
      await image.decode();
    }));
    try {
      await loading;
    } catch {
      // Keep the poster visible if any sheet is unavailable.
      return;
    }
    if (version !== token || !canPlay()) return;
    raf = env.requestAnimationFrame(show);
  }

  const observer = new env.MutationObserver(sync);
  observer.observe(figure, { attributes: true, attributeFilter: ['data-motion-playing'] });
  const onHide = () => { pageAway = true; stop(); };
  const onShow = () => { pageAway = false; void sync(); };
  preference.addEventListener('change', sync);
  connection?.addEventListener('change', sync);
  env.document.addEventListener('visibilitychange', sync);
  env.addEventListener('pagehide', onHide);
  env.addEventListener('pageshow', onShow);
  void sync();

  return () => {
    pageAway = true;
    stop();
    observer.disconnect();
    preference.removeEventListener('change', sync);
    connection?.removeEventListener('change', sync);
    env.document.removeEventListener('visibilitychange', sync);
    env.removeEventListener('pagehide', onHide);
    env.removeEventListener('pageshow', onShow);
  };
}
