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

// Read only within the explicitly approved Sophia subtrees. Never list
// the entire bucket, expose R2 keys to visitors or accept a user-supplied key.
async function resolveModel(bucket, method) {
  const read = key => method === 'HEAD' ? bucket.head(key) : bucket.get(key);
  for (const key of MODEL_KEYS) {
    const asset = await read(key);
    if (asset) return asset;
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
        if (asset) return asset;
      }
      if (!listing.truncated || !listing.cursor) break;
      cursor = listing.cursor;
    }
  }
  return null;
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
    return {
      state: direct.some(Boolean) || folders.some(item => item.filenameMatched)
        ? 'model_located' : 'model_not_located',
      direct: { canonical: direct[0], nested: direct[1] },
      folders,
    };
  } catch {
    return { state: 'storage_probe_failed' };
  }
}

const HEADERS = {
  'Cache-Control': 'public, max-age=3600',
  'Content-Type': 'model/gltf-binary',
  'Content-Disposition': 'inline; filename="Sophia_Astronaut_Rocket_v1.1.glb"',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

async function serve({ env }, method) {
  const bucket = env?.SHOREKEEPER_ASSETS_R2;
  if (!bucket) {
    return new Response('Sophia storage not configured.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
  try {
    const asset = await resolveModel(bucket, method);
    if (asset) {
      const headers = new Headers(HEADERS);
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
