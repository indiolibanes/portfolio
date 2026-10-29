// Posse explícita de recursos (GPU e CPU) + utilitários de cancelamento.
// Sem DOM e sem three.js: testável em Node.

/** Erro de cancelamento (mesmo `name` do DOMException de `AbortController`). */
export class AbortError extends Error {
  constructor(message = 'Operação cancelada.') {
    super(message);
    this.name = 'AbortError';
  }
}

export const isAbortError = (e) => !!e && (e.name === 'AbortError' || e.code === 20);

export function throwIfAborted(signal) {
  if (signal?.aborted) throw new AbortError();
}

/** Libera UM recurso de qualquer tipo conhecido. Idempotente para os tipos abaixo. */
export function releaseResource(res) {
  if (!res) return;
  if (typeof res === 'function') { res(); return; }
  if (res.isTexture) {
    // Texturas do GLB carregado usam ImageBitmap: precisam de close() além de dispose().
    const img = res.image;
    if (img && typeof img.close === 'function') img.close();
    res.dispose();
    return;
  }
  if (typeof res.dispose === 'function') { res.dispose(); return; }
  if (typeof res.close === 'function') res.close(); // ImageBitmap solto
}

/**
 * Conjunto de recursos pertencentes a UM dono. Regras:
 *  - `track()` assume a posse imediatamente (antes de qualquer `await` seguinte);
 *  - o mesmo objeto nunca é liberado duas vezes (identidade num Set);
 *  - `disposeAll()` é idempotente e nunca lança: um erro num recurso não impede os demais;
 *  - depois de fechado, um recurso que chegue tarde via `track()` é liberado na hora.
 */
export class ResourceScope {
  constructor(label = 'scope') {
    this.label = label;
    this._items = new Set();
    this._closed = false;
    this.disposedCount = 0;
    this.errors = [];
  }

  get closed() { return this._closed; }
  get size() { return this._items.size; }
  has(res) { return this._items.has(res); }

  track(res) {
    if (!res) return res;
    if (this._closed) { this._release(res); return res; }
    this._items.add(res);
    return res;
  }

  /** Transfere a posse a outro dono (não libera). */
  untrack(res) { return this._items.delete(res); }

  /** Entrega tudo ao novo dono e esvazia este escopo sem liberar nada. */
  commit() {
    const items = [...this._items];
    this._items.clear();
    this._closed = true;
    return items;
  }

  _release(res) {
    try { releaseResource(res); this.disposedCount++; } catch (e) { this.errors.push(e); }
  }

  disposeAll() {
    if (this._closed && this._items.size === 0) return this.report();
    this._closed = true;
    // ordem inversa à de criação: dependentes antes dos dependidos
    const items = [...this._items].reverse();
    this._items.clear();
    for (const res of items) this._release(res);
    return this.report();
  }

  report() { return { label: this.label, disposed: this.disposedCount, pending: this._items.size, errors: this.errors.length }; }
}

/** Reúne geometrias, materiais e texturas (todas as propriedades-textura) de uma árvore three.js. */
export function collectSceneResources(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      materials.add(m);
      for (const k of Object.keys(m)) {
        const v = m[k];
        if (v && v.isTexture) textures.add(v);
      }
    }
  });
  return { geometries, materials, textures };
}
