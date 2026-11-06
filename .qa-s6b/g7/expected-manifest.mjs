/**
 * Parse owner-supplied expected.json without exposing private hashes in logs.
 * Supported shapes: [{name,sha256,bytes}], {files:[...]}, {files:{name:{sha256,bytes}}},
 * {name:{sha256,bytes}} and legacy {name:"<sha256>"}.
 * No filesystem or network access. Reject duplicate names and malformed records.
 */
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function normalizeExpectedManifest(raw) {
  const container = isRecord(raw) && Object.hasOwn(raw, 'files') ? raw.files : raw;
  const entries = Array.isArray(container)
    ? container.map(value => {
        if (!isRecord(value) || typeof value.name !== 'string') {
          throw new Error('Invalid expected.json array entry');
        }
        return [value.name, value];
      })
    : isRecord(container) ? Object.entries(container) : null;
  if (!entries || !entries.length) throw new Error('Invalid or empty expected.json');

  const normalized = new Map();
  for (const [name, value] of entries) {
    if (typeof name !== 'string' || !/^[\w.-]+\.glb$/i.test(name)) {
      throw new Error('Invalid asset name in expected.json');
    }
    if (normalized.has(name)) throw new Error('Duplicate asset in expected.json: ' + name);
    const record = typeof value === 'string' ? {sha256: value} : value;
    if (!isRecord(record) || typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(record.sha256)) {
      throw new Error('Invalid SHA-256 in expected.json for ' + name);
    }
    if (record.bytes !== undefined && (!Number.isSafeInteger(record.bytes) || record.bytes < 0)) {
      throw new Error('Invalid byte count in expected.json for ' + name);
    }
    normalized.set(name, {sha256: record.sha256.toLowerCase(), ...(record.bytes === undefined ? {} : {bytes: record.bytes})});
  }
  return normalized;
}
