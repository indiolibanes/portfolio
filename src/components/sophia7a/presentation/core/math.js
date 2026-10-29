// Funções puras (sem three.js, sem DOM) — testáveis em Node.

export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Amortecimento exponencial independente da taxa de quadros. */
export const damp = (current, target, lambda, dt) =>
  target + (current - target) * Math.exp(-lambda * dt);

export const lerp = (a, b, t) => a + (b - a) * t;

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Menor diferença angular b - a, em (-π, π]. */
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Distância da câmera para enquadrar uma caixa (altura × largura, em unidades do
 * modelo) com margem, dados o FOV vertical (graus) e o aspecto da viewport.
 */
export function fitDistance({ height, width, fovDeg, aspect, margin = 1.14 }) {
  const t = Math.tan((fovDeg * DEG) / 2);
  const byHeight = (height * margin) / 2 / t;
  const byWidth = (width * margin) / 2 / (t * Math.max(aspect, 0.05));
  return Math.max(byHeight, byWidth);
}

/** Deslocamento de projeção (px) para manter o modelo no centro da área livre. */
export function safeAreaOffsetX({ left = 0, right = 0 }) {
  return (right - left) / 2;
}

export function safeAreaOffsetY({ top = 0, bottom = 0 }) {
  return (bottom - top) / 2;
}
