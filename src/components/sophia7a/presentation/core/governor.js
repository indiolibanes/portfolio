/**
 * Governador de desempenho (puro). Recebe o tempo de cada quadro REALMENTE
 * renderizado e decide subir/descer o nível de qualidade:
 *   nível 0 = máximo; níveis maiores = menos pixels / menos efeitos.
 * Histerese: desce rápido (p75 do quadro acima do limite), sobe devagar
 * (p90 abaixo do limite por um tempo contínuo). Não conhece three.js.
 *
 * Quadros LIMITADOS (`paced`): num nível com limitador de taxa (fxFpsCapMs > 0) o intervalo entre
 * quadros mede o limitador, não o aparelho — se entrassem na janela, o nível nunca se recuperaria
 * (p90 ≈ 33 ms > 18,5 ms para sempre). Eles são ignorados para decisões de subida, e a recuperação
 * passa a ser decidida por SONDAGENS: janelas curtas sem limitador em que se medem, quadro a quadro,
 * o intervalo real, o tempo de CPU e (se houver extensão) o tempo de GPU. Cada sondagem reprovada
 * dobra o intervalo até a próxima (recuo exponencial); uma descida logo após uma subida (oscilação)
 * também. Subir exige várias sondagens consecutivas aprovadas.
 */
export const QUALITY_LEVELS = Object.freeze([
  Object.freeze({ dprScale: 1.0, starfield: true, halos: true, fxFpsCapMs: 0 }),
  Object.freeze({ dprScale: 0.85, starfield: true, halos: true, fxFpsCapMs: 0 }),
  Object.freeze({ dprScale: 0.7, starfield: false, halos: true, fxFpsCapMs: 0 }),
  Object.freeze({ dprScale: 0.55, starfield: false, halos: false, fxFpsCapMs: 33 }),
]);

export class PerformanceGovernor {
  constructor({
    enabled = true,
    windowFrames = 90,
    downP75Ms = 28, // ≈ 35 fps
    upP90Ms = 18.5, // sustenta ~60 fps (vsync)
    downCooldownMs = 2500,
    upAfterMs = 12000,
    maxLevel = QUALITY_LEVELS.length - 1,
    fastMinFrames = 12, // via rápida: com poucas amostras, só se a lentidão for severa
    fastDownP75Ms = 84, // ≈ 12 fps
    pauseMs = 1000, // um quadro mais longo que isso é "pausa" (aba/suspensão) — se isolado
    sustainedLong = 3, // …mas 3 ou mais seguidos são lentidão sustentada, não pausa
    isPacedLevel = (lvl) => QUALITY_LEVELS[lvl]?.fxFpsCapMs > 0, // níveis cujo intervalo é moldado por um limitador
    probeEveryMs = 8000, // primeira sondagem, a contar da entrada no nível
    probeMaxBackoffMs = 64000,
    probeConfirmGapMs = 1000, // intervalo entre sondagens aprovadas consecutivas
    probePassesNeeded = 2,
    probeFrames = 24, // amostras válidas por sondagem (≈ 0,4 s a 60 Hz)
    probeWarmup = 3, // quadros descartados na transição para sem limite
    probeCpuBudgetMs = 10, // p90 do tempo de CPU por quadro
    probeGpuBudgetMs = 12, // p90 do tempo de GPU por quadro (só se medido)
    flapWindowMs = 30000, // descer dentro dessa janela depois de subir conta como oscilação
    staleSampleMs = 3000, // amostras mais velhas que isso não contam para "bom por 12 s"
  } = {}) {
    this.enabled = enabled;
    this.windowFrames = windowFrames;
    this.downP75Ms = downP75Ms;
    this.upP90Ms = upP90Ms;
    this.downCooldownMs = downCooldownMs;
    this.upAfterMs = upAfterMs;
    this.maxLevel = maxLevel;
    this.fastMinFrames = fastMinFrames;
    this.fastDownP75Ms = fastDownP75Ms;
    this.pauseMs = pauseMs;
    this.sustainedLong = sustainedLong;
    this._longRun = 0;
    this.level = 0;
    this._buf = [];
    this._lastChange = -Infinity;
    this._goodSince = null;
    this.isPacedLevel = isPacedLevel;
    Object.assign(this, { probeEveryMs, probeMaxBackoffMs, probeConfirmGapMs, probePassesNeeded, probeFrames, probeWarmup, probeCpuBudgetMs, probeGpuBudgetMs, flapWindowMs, staleSampleMs });
    this._probe = null;
    this._probeBackoffMs = probeEveryMs;
    this._nextProbeAt = probeEveryMs; // relativo ao relógio de quem chama; reset() reancora
    this._probePasses = 0;
    this._lastPromoteAt = null;
    this._lastSampleAt = null;
    this.stats = { probes: 0, passed: 0, failed: 0, aborted: 0, promotions: 0, demotions: 0, flaps: 0, lastProbe: null };
  }

  get probing() { return this._probe !== null; }

  /** Estado resumido para métricas/diagnóstico. */
  snapshot() {
    return { level: this.level, probing: this.probing, backoffMs: this._probeBackoffMs, nextProbeAt: Number.isFinite(this._nextProbeAt) ? Math.round(this._nextProbeAt) : null, passes: this._probePasses, ...this.stats };
  }

  static percentile(sorted, p) {
    if (!sorted.length) return 0;
    const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
    return sorted[i];
  }

  reset(nowMs) {
    this._buf.length = 0;
    this._longRun = 0;
    this._goodSince = null;
    this._lastChange = nowMs;
    this._lastSampleAt = null;
    this._probe = null;
    this._probePasses = 0;
    this._nextProbeAt = nowMs + this._probeBackoffMs;
  }

  /**
   * Chamado a cada quadro candidato. Devolve true enquanto uma sondagem está aberta (o motor deve
   * então renderizar SEM o limitador). Só abre sondagem em nível limitado, com o governador ativo.
   */
  beginProbeIfDue(nowMs) {
    if (!this.enabled) return false;
    if (this._probe) return true;
    if (this.level <= 0 || !this.isPacedLevel(this.level)) return false;
    if (nowMs < this._nextProbeAt) return false;
    this._probe = { startedAt: nowMs, seen: 0, interval: [], cpu: [], gpu: [] };
    this.stats.probes += 1;
    return true;
  }

  /** Cancela uma sondagem em curso (aba oculta, fora da tela, cena ociosa): não conta como reprovada. */
  abortProbe() {
    if (!this._probe) return;
    this._probe = null;
    this.stats.aborted += 1;
    this._probePasses = 0;
  }

  /**
   * @param {number} dtMs  tempo do quadro
   * @param {number} nowMs relógio monotônico
   * @returns {number|null} novo nível, se mudou
   */
  push(dtMs, nowMs, { paced = false, cpuMs = null, gpuMs = null } = {}) {
    if (!this.enabled) return null;
    if (!(dtMs > 0)) return null;
    if (this._probe) return this._pushProbe(dtMs, nowMs, cpuMs, gpuMs);
    if (paced) return null; // o intervalo deste quadro foi moldado pelo limitador de taxa: não mede o aparelho
    // sem amostras recentes, o que sobrou na janela é velho: recomeça (evita subir por dados antigos)
    if (this._lastSampleAt !== null && nowMs - this._lastSampleAt - dtMs > this.staleSampleMs) {
      this._buf.length = 0;
      this._goodSince = null;
      this._longRun = 0;
    }
    this._lastSampleAt = nowMs;
    if (dtMs > this.pauseMs) {
      // Pausa isolada (aba em segundo plano, suspensão): ignorada. Vários quadros longos SEGUIDOS não são pausa:
      // o dispositivo está realmente lento (p.ex. 2–3 s por quadro) e o governador precisa reagir.
      this._longRun += 1;
      if (this._longRun < this.sustainedLong) return null;
    } else {
      this._longRun = 0;
    }
    this._buf.push(Math.min(dtMs, 5000));
    if (this._buf.length > this.windowFrames) this._buf.shift();
    const severe = this._buf.length >= this.fastMinFrames;
    if (this._buf.length < this.windowFrames && !severe) return null;

    const sorted = [...this._buf].sort((a, b) => a - b);
    const p75 = PerformanceGovernor.percentile(sorted, 0.75);
    const p90 = PerformanceGovernor.percentile(sorted, 0.9);

    const full = this._buf.length >= this.windowFrames;
    const slow = full ? p75 > this.downP75Ms : p75 > this.fastDownP75Ms;
    if (slow && this.level < this.maxLevel && nowMs - this._lastChange >= this.downCooldownMs) {
      this._onDemote(nowMs);
      this.level += 1;
      this.reset(nowMs);
      return this.level;
    }

    if (full && p90 < this.upP90Ms && this.level > 0) {
      if (this._goodSince === null) this._goodSince = nowMs;
      if (nowMs - this._goodSince >= this.upAfterMs && nowMs - this._lastChange >= this.downCooldownMs) {
        this._onPromote(nowMs);
        this.level -= 1;
        this.reset(nowMs);
        return this.level;
      }
    } else {
      this._goodSince = null;
    }
    return null;
  }

  _onPromote(nowMs) {
    this.stats.promotions += 1;
    this._lastPromoteAt = nowMs;
    this._probeBackoffMs = this.probeEveryMs; // provou capacidade: sondagens voltam ao ritmo base
  }

  _onDemote(nowMs) {
    this.stats.demotions += 1;
    if (this._lastPromoteAt !== null && nowMs - this._lastPromoteAt < this.flapWindowMs) {
      // subiu e logo precisou descer: oscilação → fica mais conservador nas próximas sondagens
      this.stats.flaps += 1;
      this._probeBackoffMs = Math.min(this.probeMaxBackoffMs, this._probeBackoffMs * 2);
    }
  }

  _pushProbe(dtMs, nowMs, cpuMs, gpuMs) {
    const p = this._probe;
    p.seen += 1;
    if (gpuMs !== null && Number.isFinite(gpuMs)) p.gpu.push(gpuMs); // resultados de GPU chegam atrasados: guardar sempre
    if (p.seen <= this.probeWarmup) return null;
    p.interval.push(Math.min(dtMs, 5000));
    if (cpuMs !== null && Number.isFinite(cpuMs)) p.cpu.push(cpuMs);
    const n = p.interval.length;
    const pct = (arr, q) => PerformanceGovernor.percentile([...arr].sort((a, b) => a - b), q);
    // reprovação antecipada: claramente lento já nos primeiros quadros → encerra sem gastar a janela toda
    if (n >= 8 && n < this.probeFrames && pct(p.interval, 0.75) > this.downP75Ms) return this._endProbe(nowMs, false, 'lento');
    if (n < this.probeFrames) return null;

    const interval90 = pct(p.interval, 0.9);
    const cpu90 = p.cpu.length >= 8 ? pct(p.cpu, 0.9) : null;
    const gpu90 = p.gpu.length >= 8 ? pct(p.gpu, 0.9) : null;
    const ok = interval90 < this.upP90Ms && (cpu90 === null || cpu90 < this.probeCpuBudgetMs) && (gpu90 === null || gpu90 < this.probeGpuBudgetMs);
    this.stats.lastProbe = { ok, interval90: Math.round(interval90 * 10) / 10, cpu90: cpu90 === null ? null : Math.round(cpu90 * 10) / 10, gpu90: gpu90 === null ? null : Math.round(gpu90 * 10) / 10 };
    return this._endProbe(nowMs, ok, ok ? 'ok' : 'reprovada');
  }

  _endProbe(nowMs, ok, why) {
    this._probe = null;
    if (!ok) {
      this.stats.failed += 1;
      this._probePasses = 0;
      this._probeBackoffMs = Math.min(this.probeMaxBackoffMs, this._probeBackoffMs * 2);
      this._nextProbeAt = nowMs + this._probeBackoffMs;
      if (why === 'lento') this.stats.lastProbe = { ok: false, interval90: null, cpu90: null, gpu90: null, early: true };
      return null;
    }
    this.stats.passed += 1;
    this._probePasses += 1;
    this._nextProbeAt = nowMs + this.probeConfirmGapMs;
    if (this._probePasses >= this.probePassesNeeded && nowMs - this._lastChange >= this.downCooldownMs && this.level > 0) {
      this._onPromote(nowMs);
      this.level -= 1;
      this.reset(nowMs);
      return this.level;
    }
    return null;
  }
}

/** Escolha inicial de qualidade (heurística; NÃO validada em dispositivos reais). */
export function pickQuality({ coarsePointer, deviceMemory, hardwareConcurrency }) {
  if (!coarsePointer) return 'high';
  const weak = (deviceMemory && deviceMemory <= 4) || (hardwareConcurrency && hardwareConcurrency <= 4);
  return weak ? 'low' : 'medium';
}

export const QUALITY_PRESETS = Object.freeze({
  high: Object.freeze({ dprCap: 2, textureCap: 2048 }),
  medium: Object.freeze({ dprCap: 1.75, textureCap: 2048 }),
  low: Object.freeze({ dprCap: 1.25, textureCap: 1024 }),
});
