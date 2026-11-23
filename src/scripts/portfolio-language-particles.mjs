const MAX_GLYPHS = 220;
const segmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

function snapshot(nodes) {
  const particles = [];
  const hosts = new Set();
  const range = document.createRange();

  for (const node of nodes) {
    const host = node.parentElement;
    if (!host?.animate || host.childElementCount || host.closest('svg, title, option, [aria-live], [role="status"]')) continue;
    const box = host.getBoundingClientRect();
    if (box.width < 3 || box.height < 3 || box.right <= 0 || box.left >= innerWidth || box.bottom <= 0 || box.top >= innerHeight) continue;
    const style = getComputedStyle(host);
    if (style.visibility !== 'visible' || style.opacity === '0') continue;
    if (host.checkVisibility && !host.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;

    const text = node.data;
    const before = particles.length;
    let index = 0;
    const glyphs = segmenter ? Array.from(segmenter.segment(text), ({ segment }) => segment) : Array.from(text);

    for (const glyph of glyphs) {
      const start = index;
      index += glyph.length;
      if (!glyph.trim()) continue;
      range.setStart(node, start);
      range.setEnd(node, index);
      const rect = range.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > innerHeight || rect.left < 0 || rect.right > innerWidth || rect.width === 0) continue;
      const angle = Math.random() * Math.PI * 2;
      const distance = 12 + Math.random() * 42;
      particles.push({
        glyph: style.textTransform === 'uppercase' ? glyph.toUpperCase() : glyph,
        x: rect.left,
        y: (rect.top + rect.bottom) / 2,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        color: style.color,
        font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
      });
      // Sample each block so long paragraphs don't consume the viewport budget.
      if (particles.length - before >= 34 || particles.length >= MAX_GLYPHS) break;
    }
    if (particles.length > before) hosts.add(host);
    if (particles.length >= MAX_GLYPHS) break;
  }

  return { particles, hosts };
}

function phase(context, scene, assembling, reducedMotion) {
  const duration = assembling ? 330 : 220;
  const opacity = assembling ? [0, 1] : [1, 0];
  const animations = Array.from(scene.hosts, (host) => host.animate(
    opacity.map((value) => ({ opacity: value })),
    { duration, easing: 'ease-in-out', fill: 'both' },
  ));

  return new Promise((resolve) => {
    const start = performance.now();
    const x = scrollX;
    const y = scrollY;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      context.clearRect(0, 0, innerWidth, innerHeight);
      if (t === 1 || reducedMotion.matches || scrollX !== x || scrollY !== y) {
        resolve(() => animations.forEach((animation) => animation.cancel()));
        return;
      }
      const amount = assembling ? (1 - t) ** 2 : 1 - (1 - t) ** 2;
      context.globalAlpha = assembling ? Math.sin(t * Math.PI) : 1 - t;
      for (const point of scene.particles) {
        context.fillStyle = point.color;
        context.font = point.font;
        context.fillText(point.glyph, point.x + point.dx * amount, point.y + point.dy * amount);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export async function dissolveCopy(nodes, swap, reducedMotion) {
  const outgoing = snapshot(nodes);
  if (!outgoing.particles.length) {
    swap();
    return;
  }
  const canvas = document.createElement('canvas');
  const scale = Math.min(devicePixelRatio, 1.5);
  canvas.width = Math.round(innerWidth * scale);
  canvas.height = Math.round(innerHeight * scale);
  canvas.className = 'portfolio-language-particles';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  if (!context) {
    swap();
    return;
  }
  context.scale(scale, scale);
  context.textBaseline = 'middle';
  document.body.append(canvas);
  let clearOutgoing;
  let clearIncoming;
  try {
    clearOutgoing = await phase(context, outgoing, false, reducedMotion);
    swap();
    clearOutgoing();
    if (!reducedMotion.matches) clearIncoming = await phase(context, snapshot(nodes), true, reducedMotion);
  } finally {
    clearOutgoing?.();
    clearIncoming?.();
    canvas.remove();
  }
}
