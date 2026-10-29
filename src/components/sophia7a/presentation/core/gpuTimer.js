// Cronômetro de GPU opcional (EXT_disjoint_timer_query_webgl2). Só é usado nas janelas de sondagem
// do governador. Quando a extensão não existe (Safari, Firefox por padrão, SwiftShader…), `supported`
// é false e o governador decide só por intervalo de quadro + tempo de CPU.
//
// Os resultados chegam de forma assíncrona (quadros depois). Medidas "disjoint" são descartadas.

export class GpuTimer {
  constructor(gl) {
    this.gl = gl;
    this.ext = null;
    try { this.ext = gl?.getExtension?.('EXT_disjoint_timer_query_webgl2') ?? null; } catch { this.ext = null; }
    this.supported = !!this.ext;
    this._open = null;
    this._pending = [];
    this.discarded = 0;
  }

  begin() {
    if (!this.supported || this._open) return;
    try {
      const q = this.gl.createQuery();
      if (!q) return;
      this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
      this._open = q;
    } catch { this._open = null; }
  }

  end() {
    if (!this._open) return;
    try { this.gl.endQuery(this.ext.TIME_ELAPSED_EXT); this._pending.push(this._open); } catch { /* ignora */ }
    this._open = null;
  }

  /** Recolhe resultados prontos. Devolve uma lista de milissegundos. */
  poll() {
    if (!this.supported || !this._pending.length) return [];
    const gl = this.gl;
    const out = [];
    let disjoint = false;
    try { disjoint = !!gl.getParameter(this.ext.GPU_DISJOINT_EXT); } catch { disjoint = true; }
    const still = [];
    for (const q of this._pending) {
      let ready = false;
      try { ready = !!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE); } catch { ready = true; }
      if (!ready) { still.push(q); continue; }
      if (disjoint) this.discarded++;
      else {
        try { out.push(Number(gl.getQueryParameter(q, gl.QUERY_RESULT)) / 1e6); } catch { this.discarded++; }
      }
      try { gl.deleteQuery(q); } catch { /* ignora */ }
    }
    this._pending = still;
    return out;
  }

  dispose() {
    for (const q of [...this._pending, this._open]) {
      if (!q) continue;
      try { this.gl.deleteQuery(q); } catch { /* ignora */ }
    }
    this._pending = [];
    this._open = null;
  }
}
