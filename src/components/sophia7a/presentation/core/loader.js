import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { estimateTextureBytes } from './stats.js';
import { AbortError, ResourceScope, collectSceneResources, throwIfAborted } from './ownership.js';

const now = () => performance.now();

/** Baixa um arquivo com progresso (usa Content-Length ou `expectedBytes`). Cancelável por `signal`. */
export async function fetchWithProgress(url, { signal, expectedBytes = 0, onProgress } = {}) {
  const t0 = now();
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Falha ao baixar o modelo (${res.status} ${res.statusText}): ${url}`);
  const headerLen = Number(res.headers.get('content-length')) || 0;
  const encoded = !!res.headers.get('content-encoding');
  // Com compressão de transporte, Content-Length é o tamanho comprimido: não serve de total.
  const total = !encoded && headerLen ? headerLen : expectedBytes;

  if (!res.body || !res.body.getReader) {
    const buffer = await res.arrayBuffer();
    throwIfAborted(signal);
    onProgress?.(1, buffer.byteLength, buffer.byteLength);
    return { buffer, ms: now() - t0, bytes: buffer.byteLength };
  }
  const reader = res.body.getReader();
  const stop = () => { reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', stop, { once: true });
  const chunks = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      throwIfAborted(signal);
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      onProgress?.(total ? Math.min(0.99, received / total) : 0, received, total);
    }
  } finally {
    signal?.removeEventListener('abort', stop);
  }
  const out = new Uint8Array(received);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  onProgress?.(1, received, total || received);
  return { buffer: out.buffer, ms: now() - t0, bytes: received };
}

export async function sha256Hex(buffer) {
  if (!globalThis.crypto?.subtle) return null; // contexto não seguro (http fora de localhost)
  const d = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Reduz a resolução de uma textura NO RUNTIME (o arquivo GLB não é tocado).
 * Posse: o bitmap novo pertence a esta função até a troca; se a operação for cancelada
 * antes da troca, ele é fechado aqui e a textura permanece como estava.
 */
async function capTexture(tex, cap, signal) {
  const img = tex.image;
  const w = img?.width, h = img?.height;
  if (!w || !h || Math.max(w, h) <= cap || typeof createImageBitmap !== 'function') return false;
  const s = cap / Math.max(w, h);
  const bmp = await createImageBitmap(img, {
    resizeWidth: Math.round(w * s),
    resizeHeight: Math.round(h * s),
    resizeQuality: 'high',
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
  if (signal?.aborted) { bmp.close(); throw new AbortError(); }
  if (typeof img.close === 'function') img.close();
  tex.image = bmp;
  tex.needsUpdate = true;
  return true;
}

/** Sobe a textura à GPU só se isso ainda for seguro (não cancelado, contexto vivo). */
export function uploadTexture(renderer, tex, signal) {
  if (signal?.aborted) return false;
  try { if (renderer.getContext().isContextLost()) return false; } catch { return false; }
  renderer.initTexture(tex);
  return true;
}

const TEXTURE_SLOTS = ['map', 'metalnessMap', 'roughnessMap', 'normalMap', 'aoMap', 'emissiveMap'];

/**
 * Carrega a máscara externa da constelação. A rede é cancelável (fetch + signal); a decodificação
 * usa o mesmo caminho de <img> do TextureLoader (mesmos pixels). A textura devolvida ainda NÃO foi
 * enviada à GPU: quem a recebe assume a posse e decide quando fazer o upload.
 */
export async function loadMaskTexture(url, { signal } = {}) {
  throwIfAborted(signal);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Falha ao baixar a máscara (${res.status} ${res.statusText}): ${url}`);
  const blob = await res.blob();
  throwIfAborted(signal);
  const objectUrl = URL.createObjectURL(blob);
  const img = new Image();
  try {
    img.src = objectUrl;
    await new Promise((resolve, reject) => {
      const onAbort = () => { img.onload = img.onerror = null; img.removeAttribute('src'); reject(new AbortError()); };
      signal?.addEventListener('abort', onAbort, { once: true });
      img.onload = () => { signal?.removeEventListener('abort', onAbort); resolve(); };
      img.onerror = () => { signal?.removeEventListener('abort', onAbort); reject(new Error(`Imagem da máscara inválida: ${url}`)); };
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  throwIfAborted(signal);
  const texture = new THREE.Texture(img);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Carrega o GLB ORIGINAL, sem modificar geometria, materiais ou texturas.
 * Só ajusta parâmetros de amostragem (anisotropia) e, se pedido, a resolução
 * efetiva das texturas no runtime.
 *
 * Ciclo de vida: tudo o que é criado entra imediatamente num ResourceScope local. Se qualquer etapa
 * lançar (inclusive cancelamento), o `finally` libera o que existir; só em caso de sucesso a posse
 * é entregue ao chamador (`model.dispose()`). Nenhum upload à GPU acontece depois do cancelamento.
 */
export async function loadSophiaModel({
  url,
  renderer,
  signal,
  expectedBytes = 0,
  expectedSha256 = null,
  textureCap = 2048,
  anisotropy = 8,
  onPhase,
  onProgress,
  onScope,
}) {
  const scope = new ResourceScope('modelo');
  // Entrega o escopo ao chamador ANTES de qualquer await: se o dono for descartado durante o
  // carregamento, ele libera as texturas já enviadas enquanto o contexto GL ainda é válido
  // (liberar depois de renderer.dispose() não consegue mais apagar os handles da GPU).
  try { onScope?.(scope); } catch { /* observador não pode quebrar o carregamento */ }
  let committed = false;
  try {
    const tStart = now();
    throwIfAborted(signal);
    onPhase?.('download');
    const dl = await fetchWithProgress(url, { signal, expectedBytes, onProgress });
    throwIfAborted(signal);

    let verifyMs = 0, sha256 = null, integrityOk = null;
    if (expectedSha256) {
      onPhase?.('verify');
      const t = now();
      sha256 = await sha256Hex(dl.buffer);
      throwIfAborted(signal);
      integrityOk = sha256 === null ? null : sha256 === expectedSha256.toLowerCase();
      verifyMs = now() - t;
      if (integrityOk === false) throw new Error(`Integridade do GLB não confere (sha256 ${sha256}).`);
    }

    onPhase?.('decode');
    throwIfAborted(signal);
    const tDecode = now();
    const gltf = await new GLTFLoader().parseAsync(dl.buffer, '');
    // A partir daqui os recursos existem: assumir a posse ANTES de qualquer outro await/throw.
    const owned = collectSceneResources(gltf.scene);
    for (const g of owned.geometries) scope.track(g);
    for (const m of owned.materials) scope.track(m);
    for (const t of owned.textures) scope.track(t);
    throwIfAborted(signal);
    const decodeMs = now() - tDecode;

    const root = gltf.scene;
    const meshes = [];
    root.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (!meshes.length) throw new Error('O GLB não contém malhas.');
    const mesh = meshes[0];
    const materials = [...new Set(meshes.map((m) => m.material))];

    // geometria: leitura de caixa e contagem (nada é escrito)
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);

    onPhase?.('upload');
    const tUp = now();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures = [];
    const seen = new Set();
    for (const mat of materials) {
      for (const slot of TEXTURE_SLOTS) {
        const tex = mat[slot];
        if (!tex || seen.has(tex)) continue;
        seen.add(tex);
        throwIfAborted(signal);
        tex.anisotropy = Math.min(anisotropy, maxAniso);
        const capped = await capTexture(tex, textureCap, signal);
        throwIfAborted(signal);
        uploadTexture(renderer, tex, signal); // sobe à GPU agora, fora do primeiro quadro interativo
        textures.push({
          slot,
          width: tex.image.width,
          height: tex.image.height,
          cappedAtRuntime: capped,
          estGpuBytes: estimateTextureBytes(tex.image.width, tex.image.height, { mipmaps: tex.generateMipmaps }),
        });
      }
    }
    const uploadMs = now() - tUp;

    let vertices = 0, triangles = 0, geometryBytes = 0;
    for (const m of meshes) {
      const g = m.geometry;
      vertices += g.attributes.position.count;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
      for (const a of Object.values(g.attributes)) geometryBytes += a.array.byteLength;
      if (g.index) geometryBytes += g.index.array.byteLength;
    }

    throwIfAborted(signal);
    committed = true;
    return {
      gltf, root, mesh, meshes, materials, box, textures,
      bytes: dl.bytes, sha256, integrityOk,
      stats: { vertices, triangles, geometryBytes, drawCalls: meshes.length },
      timings: { downloadMs: dl.ms, verifyMs, decodeMs, uploadMs, loadTotalMs: now() - tStart },
      /** Libera geometrias, materiais, texturas (e fecha os ImageBitmaps), sem duplicidade. */
      dispose: () => scope.disposeAll(),
      scope,
    };
  } finally {
    if (!committed) scope.disposeAll();
  }
}
