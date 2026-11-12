/**
 * Public read-only delivery of ONE explicitly approved Sophia GLB.
 *
 * This endpoint never accepts a user-provided object key. It cannot list
 * or expose other contents of the private-assets bucket (including Shorekeeper).
 *
 * Bind Cloudflare Pages env.SHOREKEEPER_ASSETS_R2 to R2 bucket private-assets
 * in BOTH Preview and Production environments.
 */
const MODEL_KEY = 'sophia/models/Sophia_Astronaut_Rocket_v1.1.glb';
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
    const asset = method === 'HEAD'
      ? await bucket.head(MODEL_KEY)
      : await bucket.get(MODEL_KEY);
    if (!asset) {
      return new Response('Sophia model not found.', {
        status: 404,
        headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    }
    const headers = new Headers(HEADERS);
    headers.set('Content-Length', String(asset.size));
    if (asset.httpEtag) headers.set('ETag', asset.httpEtag);
    return new Response(method === 'HEAD' ? null : asset.body, { status: 200, headers });
  } catch {
    return new Response('Sophia model temporarily unavailable.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
}

export const onRequestGet = (context) => serve(context, 'GET');
export const onRequestHead = (context) => serve(context, 'HEAD');
