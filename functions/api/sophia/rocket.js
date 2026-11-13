/**
 * Public read-only delivery of ONE explicitly approved Sophia GLB.
 *
 * This endpoint never accepts a user-provided object key. It cannot list
 * or expose other contents of the private-assets bucket (including Shorekeeper).
 *
 * Bind Cloudflare Pages env.SHOREKEEPER_ASSETS_R2 to R2 bucket private-assets
 * in BOTH Preview and Production environments.
 */
// Exact allowlist: the second key covers a common accidental extra bucket-name folder.
// Keep these names explicit; never accept arbitrary public R2 keys from query parameters.
const MODEL_KEYS = Object.freeze([
  'sophia/models/Sophia_Astronaut_Rocket_v1.1.glb',
  'private-assets/sophia/models/Sophia_Astronaut_Rocket_v1.1.glb',
]);
const MODEL_NAME = 'Sophia_Astronaut_Rocket_v1.1.glb';
const ALLOWED_PREFIXES = Object.freeze([
  'sophia/models/',
  'private-assets/sophia/models/',
  'sophia/',
  'private-assets/sophia/',
]);

// Final fallback for unexpected case/parent-path differences.
// Scan for the ONE explicitly approved basename under a directory segment
// named "sophia", never publishing or returning any other private object.
const ROOT_PAGE_LIMIT = 1000;
const ROOT_MAX_PAGES = 10;
const rootResolutionCache = new WeakMap();
function isSophiaModelCandidate(key) {
  if (typeof key !== 'string') return false;
  const parts = key.split('/');
  const filename = parts.pop()?.toLowerCase();
  return filename === MODEL_NAME.toLowerCase()
    && parts.some(segment => segment.toLowerCase() === 'sophia');
}
async function inspectRootForApprovedModel(bucket) {
  const prior = rootResolutionCache.get(bucket);
  if (prior && prior.expiresAt > Date.now()) return prior.result;
  let cursor;
  let completed = false;
  let hasAnyObjects = false;
  let anySophiaPath = false;
  let exactFilenameOutsideSophia = false;
  const candidates = new Set();
  for (let page = 0; page < ROOT_MAX_PAGES; page++) {
    const result = await bucket.list({
      limit: ROOT_PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });
    for (const obj of result.objects || []) {
      const key = obj.key;
      if (typeof key !== 'string') continue;
      hasAnyObjects = true;
      const parts = key.split('/');
      const name = parts.pop()?.toLowerCase();
      const hasSophiaFolder = parts.some(part => part.toLowerCase() === 'sophia');
      anySophiaPath ||= hasSophiaFolder;
      if (isSophiaModelCandidate(key)) candidates.add(key);
      else if (name === MODEL_NAME.toLowerCase()) exactFilenameOutsideSophia = true;
    }
    if (!result.truncated) { completed = true; break; }
    if (!result.cursor) break;
    cursor = result.cursor;
  }
  // If listing was incomplete or multiple copies exist, never select an
  // arbitrary private object. Resolve deterministically or fail closed.
  const key = completed && candidates.size === 1 ? [...candidates][0] : null;
  const result = {
    key,
    hasAnyObjects,
    anySophiaPath,
    approvedFilenameSeen: candidates.size > 0,
    filenameOutsideSophiaPath: exactFilenameOutsideSophia,
    ambiguous: candidates.size > 1,
    scanIncomplete: !completed,
  };
  rootResolutionCache.set(bucket, {
    result,
    expiresAt: Date.now() + (key ? 600000 : 30000),
  });
  return result;
}

// Read only within the explicitly approved Sophia subtrees. Never list
// the entire bucket, expose R2 keys to visitors or accept a user-supplied key.
// Remembers which allowlisted/approved key answered last, so warm isolates skip
// the 1-2 failed reads and the list() scans. The value only ever comes from
// MODEL_KEYS or from a listing filtered to the approved basename, never from the client.
const resolvedKeyCache = new WeakMap();
async function resolveModel(bucket, method, onlyIf) {
  const opts = onlyIf ? { onlyIf } : undefined;
  const read = key => method === 'HEAD' ? bucket.head(key) : bucket.get(key, opts);
  const remembered = resolvedKeyCache.get(bucket);
  if (remembered) {
    const asset = await read(remembered);
    if (asset) return asset;
    resolvedKeyCache.delete(bucket);
  }
  for (const key of MODEL_KEYS) {
    const asset = await read(key);
    if (asset) { resolvedKeyCache.set(bucket, key); return asset; }
  }
  if (typeof bucket.list !== 'function') return null;
  // Helps recover misplaced copies inside Sophia's models subtree while
  // restricting publication to the *exact* approved GLB filename.
  for (const prefix of ALLOWED_PREFIXES) {
    let cursor;
    for (let page = 0; page < 3; page++) {
      const listing = await bucket.list({
        prefix,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      const matchingKey = listing.objects?.find(
        ({ key }) => typeof key === 'string'
          && key.startsWith(prefix)
          && key.split('/').at(-1)?.toLowerCase() === MODEL_NAME.toLowerCase(),
      )?.key;
      if (matchingKey) {
        const asset = await read(matchingKey);
        if (asset) { resolvedKeyCache.set(bucket, matchingKey); return asset; }
      }
      if (!listing.truncated || !listing.cursor) break;
      cursor = listing.cursor;
    }
  }
  const root = await inspectRootForApprovedModel(bucket);
  return root.key ? read(root.key) : null;
}
/**
 * Coarse, public-safe read-only diagnostics. Checks the exact permitted file
 * and scans *only* Sophia prefixes. Returns no keys, filenames, object data,
 * bucket name, credentials, or private Shorekeeper metadata.
 */
export async function probeSophiaPublicR2(bucket) {
  if (!bucket) return { state: 'binding_unavailable' };
  const direct = [];
  try {
    for (const key of MODEL_KEYS) {
      direct.push(Boolean(await bucket.head(key)));
    }
    const folders = [];
    for (const prefix of ALLOWED_PREFIXES) {
      let cursor;
      let objectsSeen = 0;
      let candidateFound = false;
      let hasMore = false;
      for (let page = 0; page < 3; page++) {
        const listing = await bucket.list({
          prefix,
          limit: 100,
          ...(cursor ? { cursor } : {}),
        });
        const objects = listing.objects || [];
        objectsSeen += objects.length;
        candidateFound ||= objects.some(({ key }) =>
          typeof key === 'string' &&
          key.startsWith(prefix) &&
          key.split('/').at(-1)?.toLowerCase() === MODEL_NAME.toLowerCase(),
        );
        hasMore = Boolean(listing.truncated && listing.cursor);
        if (candidateFound || !hasMore) break;
        cursor = listing.cursor;
      }
      folders.push({
        scope: prefix === 'sophia/models/' ? 'models' :
          prefix === 'private-assets/sophia/models/' ? 'nested_models' :
          prefix === 'sophia/' ? 'sophia_tree' : 'nested_sophia_tree',
        hasObjects: objectsSeen > 0,
        filenameMatched: candidateFound,
        scanIncomplete: hasMore && !candidateFound,
      });
    }
    const knownPrefixLocated = direct.some(Boolean) || folders.some(item => item.filenameMatched);
    const root = knownPrefixLocated ? null : await inspectRootForApprovedModel(bucket);
    const located = knownPrefixLocated || Boolean(root?.key);
    return {
      state: located ? 'model_located' : 'model_not_located',
      direct: { canonical: direct[0], nested: direct[1] },
      folders,
      bucketHasAnyObjects: root ? root.hasAnyObjects : null,
      rootScan: root ? {
        approvedModelFoundOutsideKnownPrefixes: Boolean(root.key),
        hasSophiaPathAnywhere: root.anySophiaPath,
        approvedFilenameSeen: root.approvedFilenameSeen,
        filenameSeenOutsideSophiaPath: root.filenameOutsideSophiaPath,
        ambiguous: root.ambiguous,
        incomplete: root.scanIncomplete,
      } : null,
    };
  } catch {
    return { state: 'storage_probe_failed' };
  }
}

const HEADERS = {
  // Versioned file name (v1.1): a day of freshness plus a week of background revalidation.
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
  'Content-Type': 'model/gltf-binary',
  'Content-Disposition': 'inline; filename="Sophia_Astronaut_Rocket_v1.1.glb"',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

async function serve({ env, request }, method) {
  const bucket = env?.SHOREKEEPER_ASSETS_R2;
  if (!bucket) {
    return new Response('Sophia storage not configured.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
  try {
    const onlyIf = method === 'GET' ? request?.headers : undefined;
    const asset = await resolveModel(bucket, method, onlyIf);
    if (asset) {
      const headers = new Headers(HEADERS);
      if (method === 'GET' && !asset.body) {
        // R2 evaluated If-None-Match/If-Modified-Since and the cached copy is still valid.
        headers.delete('Content-Type');
        headers.delete('Content-Disposition');
        if (asset.httpEtag) headers.set('ETag', asset.httpEtag);
        return new Response(null, { status: 304, headers });
      }
      headers.set('Content-Length', String(asset.size));
      if (asset.httpEtag) headers.set('ETag', asset.httpEtag);
      return new Response(method === 'HEAD' ? null : asset.body, {
        status: 200,
        headers,
      });
    }
    return new Response('Sophia model not found.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return new Response('Sophia model temporarily unavailable.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
}

export const onRequestGet = (context) => serve(context, 'GET');
export const onRequestHead = (context) => serve(context, 'HEAD');
