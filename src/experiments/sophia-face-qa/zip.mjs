// PR #308's local ZIP intake, with bounded decompression and single-entry reads.
const MAX_ENTRY = 32 * 1024 * 1024;
const text = new TextDecoder();
export async function indexZip(file) {
  const offset = Math.max(0, file.size - 65557), tail = new DataView(await file.slice(offset).arrayBuffer());
  let end = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50 && i + 22 + tail.getUint16(i + 20, true) === tail.byteLength) { end = i; break; }
  }
  if (end < 0) throw new Error('Índice ZIP não encontrado.');
  const count = tail.getUint16(end + 10, true), size = tail.getUint32(end + 12, true), start = tail.getUint32(end + 16, true);
  if (tail.getUint16(end + 4, true) || tail.getUint16(end + 6, true) || count === 65535 || start === 0xffffffff || size > 4 * 1024 * 1024 || start + size > file.size) throw new Error('ZIP multipartes/ZIP64 ou índice inválido.');
  const bytes = new Uint8Array(await file.slice(start, start + size).arrayBuffer()), view = new DataView(bytes.buffer), entries = [];
  let at = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > size || view.getUint32(at, true) !== 0x02014b50) throw new Error('Diretório ZIP inconsistente.');
    const nameLength = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true);
    const next = at + 46 + nameLength + extra + comment;
    if (next > size) throw new Error('Entrada ZIP truncada.');
    const entry = { name: text.decode(bytes.subarray(at + 46, at + 46 + nameLength)), flags: view.getUint16(at + 8, true), method: view.getUint16(at + 10, true), compressed: view.getUint32(at + 20, true), uncompressed: view.getUint32(at + 24, true), start: view.getUint32(at + 42, true) };
    if (entry.name.split('/').includes('..') || entry.name.startsWith('/')) throw new Error('Caminho ZIP inválido.');
    entries.push(entry); at = next;
  }
  return entries;
}
export function findMaster(entries, filename) {
  const matches = entries.filter(e => e.name.split('/').at(-1) === filename);
  if (matches.length !== 1) throw new Error(`O ZIP deve conter exatamente um ${filename}.`);
  return matches[0];
}
export async function readZipMaster(file, entry, expectedBytes) {
  if (entry.flags & 1 || entry.uncompressed !== expectedBytes || entry.uncompressed > MAX_ENTRY || entry.compressed > MAX_ENTRY || ![0, 8].includes(entry.method)) throw new Error('Entrada ZIP fora do contrato R1.');
  const header = new DataView(await file.slice(entry.start, entry.start + 30).arrayBuffer());
  if (header.byteLength !== 30 || header.getUint32(0, true) !== 0x04034b50 || header.getUint16(8, true) !== entry.method) throw new Error('Cabeçalho ZIP inválido.');
  const start = entry.start + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  if (start + entry.compressed > file.size) throw new Error('Conteúdo ZIP truncado.');
  let stream = file.slice(start, start + entry.compressed).stream();
  if (entry.method === 8) {
    try { stream = stream.pipeThrough(new DecompressionStream('deflate-raw')); }
    catch { throw new Error('ZIP comprimido não suportado. Selecione o GLB extraído ou o QA Kit sem compressão.'); }
  }
  const reader = stream.getReader(), chunks = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > expectedBytes) { await reader.cancel(); throw new Error('Tamanho descompactado excede o master.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (length !== expectedBytes) throw new Error('Tamanho descompactado incorreto.');
  const result = new Uint8Array(length); let position = 0;
  for (const chunk of chunks) { result.set(chunk, position); position += chunk.byteLength; }
  return result.buffer;
}
