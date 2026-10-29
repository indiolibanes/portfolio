/** Estatísticas de quadro (puras). Só conta quadros efetivamente renderizados. */
export class FrameStats {
  constructor(capacity = 300) {
    this.capacity = capacity;
    this.buf = new Float32Array(capacity);
    this.n = 0; // quantos válidos
    this.head = 0;
    this.total = 0; // total de quadros desde o início
    this.longFrames = 0; // > 50 ms
  }

  push(dtMs) {
    if (!(dtMs > 0)) return;
    this.buf[this.head] = dtMs;
    this.head = (this.head + 1) % this.capacity;
    this.n = Math.min(this.n + 1, this.capacity);
    this.total += 1;
    if (dtMs > 50) this.longFrames += 1;
  }

  reset() {
    this.n = 0;
    this.head = 0;
  }

  snapshot() {
    if (this.n === 0) return { frames: this.total, windowFrames: 0, fps: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, low1PctFps: 0, longFrames: this.longFrames };
    const a = Array.from(this.buf.subarray(0, this.n)).sort((x, y) => x - y);
    const mean = a.reduce((s, v) => s + v, 0) / a.length;
    const pct = (p) => a[Math.min(a.length - 1, Math.max(0, Math.ceil(p * a.length) - 1))];
    const worst1 = a.slice(Math.floor(a.length * 0.99));
    const worstMean = worst1.length ? worst1.reduce((s, v) => s + v, 0) / worst1.length : pct(0.99);
    return {
      frames: this.total,
      windowFrames: this.n,
      fps: 1000 / mean,
      avgMs: mean,
      p50Ms: pct(0.5),
      p95Ms: pct(0.95),
      p99Ms: pct(0.99),
      low1PctFps: 1000 / worstMean,
      longFrames: this.longFrames,
    };
  }
}

/** Bytes estimados de uma textura 2D na GPU (RGBA8, com cadeia de mips ≈ ×4/3). */
export function estimateTextureBytes(width, height, { mipmaps = true, bytesPerPixel = 4 } = {}) {
  return Math.round(width * height * bytesPerPixel * (mipmaps ? 4 / 3 : 1));
}

export const mb = (bytes) => bytes / (1024 * 1024);
