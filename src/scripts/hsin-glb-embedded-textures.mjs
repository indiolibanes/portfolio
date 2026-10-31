/**
 * Reads glTF color textures from the binary GLB container itself.
 * This does not consult GLTFLoader's material class or texture cache.
 * Only embedded PNG/JPEG images are accepted; external asset URLs are rejected.
 * The returned bytes remain local to the browser.
 */
export function readEmbeddedDiffuse(glbBuffer) {
  const view = new DataView(glbBuffer);
  if (glbBuffer.byteLength < 28 ||
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== glbBuffer.byteLength ||
      view.getUint32(16, true) !== 0x4e4f534a) {
    throw new Error('GLB 2.0 inválido.');
  }
  const jsonLength = view.getUint32(12, true);
  const binHeader = 20 + jsonLength;
  if (binHeader + 8 > glbBuffer.byteLength ||
      view.getUint32(binHeader + 4, true) !== 0x004e4942) {
    throw new Error('Bloco BIN ausente ou inválido no GLB.');
  }
  const binLength = view.getUint32(binHeader, true);
  const start = binHeader + 8;
  if (start + binLength > glbBuffer.byteLength) {
    throw new Error('BIN truncado.');
  }
  const root = JSON.parse(new TextDecoder().decode(new Uint8Array(glbBuffer, 20, jsonLength)));
  const result = new Map();
  for (const family of ['face', 'eye']) {
    const material = (root.materials ?? []).find(m => {
      return new RegExp(family, 'i').test(m.name ?? '') &&
        m.pbrMetallicRoughness?.baseColorTexture?.index !== undefined;
    });
    if (!material) continue;
    const ref = material.pbrMetallicRoughness.baseColorTexture;
    const texture = root.textures?.[ref.index];
    const image = root.images?.[texture?.source];
    const bufferView = root.bufferViews?.[image?.bufferView];
    if (!image || !bufferView || bufferView.buffer !== 0) continue;
    const mime = image.mimeType;
    if (mime !== 'image/png' && mime !== 'image/jpeg') continue;
    const offset = bufferView.byteOffset ?? 0;
    const length = bufferView.byteLength ?? 0;
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) ||
        offset < 0 || length <= 0 || offset + length > binLength) continue;
    const bytes = new Uint8Array(glbBuffer, start + offset, length).slice();
    result.set(family, {
      bytes,
      mimeType: mime,
      materialName: material.name || family,
      imageName: image.name || ('image ' + texture.source),
      texCoord: ref.texCoord ?? 0,
      sampler: texture.sampler !== undefined ? (root.samplers?.[texture.sampler] ?? {}) : {},
    });
  }
  return result;
}
