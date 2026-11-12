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
    // No bucket listing and no access to other character prefixes. The first
    // existing member of this fixed allowlist is the only asset we expose.
    for (const key of MODEL_KEYS) {
      const asset = method === 'HEAD'
        ? await bucket.head(key)
        : await bucket.get(key);
      if (!asset) continue;
      const headers = new Headers(HEADERS);
      headers.set('Content-Length', String(asset.size));
      if (asset.httpEtag) headers.set('ETag', asset.httpEtag);
      return new Response(method === 'HEAD' ? null : asset.body, { status: 200, headers });
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
