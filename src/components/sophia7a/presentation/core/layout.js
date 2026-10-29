// Geometria pura (sem DOM): quanto da área do componente o painel do livro cobre.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Calcula a reserva (px) que o motor deve descontar da projeção para que o modelo
 * fique centrado na área livre. Mede o painel REAL (não assume breakpoint), de modo
 * que funciona em qualquer largura de contêiner, rotação ou zoom.
 *
 * @param {{width:number,height:number}} root   tamanho do contêiner (px de layout)
 * @param {{left:number,top:number,width:number,height:number}|null} panel
 *        posição do painel RELATIVA ao contêiner, em px de layout (offsetLeft/offsetTop…)
 * @returns {{left?:number,right?:number,top?:number,bottom?:number}}  `{}` se não há cobertura
 */
export function computeBookReserve(root, panel, { maxFraction = 0.6 } = {}) {
  const W = root?.width, H = root?.height;
  if (!(W > 0) || !(H > 0) || !panel || !(panel.width > 0) || !(panel.height > 0)) return {};
  const left = clamp(panel.left, 0, W), right = clamp(panel.left + panel.width, 0, W);
  const top = clamp(panel.top, 0, H), bottom = clamp(panel.top + panel.height, 0, H);
  const ow = right - left, oh = bottom - top;
  if (ow <= 0 || oh <= 0) return {};

  const round = (v) => Math.round(v * 10) / 10;
  // Folha horizontal (celular): cobre quase a largura toda MAS não a altura. Um painel lateral largo num
  // contêiner estreito cobre as duas coisas e continua sendo lateral.
  const sheet = ow / W >= 0.8 && oh / H < 0.8;
  if (sheet) {
    if (top + oh / 2 >= H / 2) return { bottom: round(Math.min(H - top, H * maxFraction)) };
    return { top: round(Math.min(bottom, H * maxFraction)) };
  }
  // painel lateral
  if (left + ow / 2 >= W / 2) return { right: round(Math.min(W - left, W * maxFraction)) };
  return { left: round(Math.min(right, W * maxFraction)) };
}

/** Igualdade com tolerância (evita reaplicar a mesma reserva por ruído de arredondamento). */
export function sameReserve(a = {}, b = {}, eps = 0.5) {
  return ['left', 'right', 'top', 'bottom'].every((k) => Math.abs((a[k] || 0) - (b[k] || 0)) <= eps);
}
