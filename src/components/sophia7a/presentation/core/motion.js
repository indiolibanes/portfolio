import { DEG, damp } from './math.js';

/**
 * Movimento RÍGIDO do objeto inteiro (flutuação + inclinação). Nenhuma deformação:
 * o resultado é só uma translação em Y e rotações do grupo-pivô.
 * Unidades: o modelo tem 1,0 de altura.
 */
export const DEFAULT_MOTION = Object.freeze({
  floatAmplitude: 0.0115, // ≈1,15 % da altura
  floatHz: 0.21, // período ≈ 4,8 s
  roll: { deg: 1.1, hz: 0.13, phase: 0.7 },
  pitch: { deg: 0.8, hz: 0.17, phase: 2.1 },
  yaw: { deg: 2.0, hz: 0.09, phase: 4.0 },
  pointerLeanDeg: 2.6, // inclinação máxima em direção ao ponteiro
  envelopeLambda: 3.2, // suavização de pausar/retomar
  leanLambda: 4.5,
  reducedAmplitudeScale: 0.5, // se o usuário reativar o movimento sob prefers-reduced-motion
});

/** Pose autônoma em função do tempo e do envelope (0..1). */
export function floatPose(t, envelope, cfg = DEFAULT_MOTION) {
  const tau = Math.PI * 2;
  return {
    y: envelope * cfg.floatAmplitude * Math.sin(tau * cfg.floatHz * t),
    roll: envelope * cfg.roll.deg * DEG * Math.sin(tau * cfg.roll.hz * t + cfg.roll.phase),
    pitch: envelope * cfg.pitch.deg * DEG * Math.sin(tau * cfg.pitch.hz * t + cfg.pitch.phase),
    yaw: envelope * cfg.yaw.deg * DEG * Math.sin(tau * cfg.yaw.hz * t + cfg.yaw.phase),
  };
}

/**
 * Estado do movimento: envelope suave (pausa/retoma sem salto) + inclinação em
 * direção ao ponteiro. `step` devolve a pose final a aplicar ao pivô.
 */
export class MotionState {
  constructor(cfg = DEFAULT_MOTION) {
    this.cfg = cfg;
    this.t = 0;
    this.envelope = 0; // começa em repouso e “respira” até 1
    this.leanX = 0;
    this.leanY = 0;
  }

  /** @param {{paused:boolean, reduced:boolean, pointer:{x:number,y:number}|null}} s */
  step(dt, s) {
    const cfg = this.cfg;
    this.t += dt;
    const scale = s.reduced ? cfg.reducedAmplitudeScale : 1;
    const target = s.paused ? 0 : scale;
    this.envelope = damp(this.envelope, target, cfg.envelopeLambda, dt);
    const px = s.pointer && !s.paused ? s.pointer.x : 0;
    const py = s.pointer && !s.paused ? s.pointer.y : 0;
    this.leanX = damp(this.leanX, px, cfg.leanLambda, dt);
    this.leanY = damp(this.leanY, py, cfg.leanLambda, dt);
    const p = floatPose(this.t, this.envelope, cfg);
    const lean = cfg.pointerLeanDeg * DEG * Math.min(1, this.envelope / Math.max(scale, 1e-6));
    return {
      y: p.y,
      roll: p.roll - this.leanX * lean * 0.5,
      pitch: p.pitch - this.leanY * lean * 0.6,
      yaw: p.yaw + this.leanX * lean,
      envelope: this.envelope,
    };
  }

  /** Verdadeiro enquanto ainda há movimento a renderizar. */
  get active() {
    return (
      this.envelope > 1e-3 ||
      Math.abs(this.leanX) > 1e-3 ||
      Math.abs(this.leanY) > 1e-3
    );
  }
}
