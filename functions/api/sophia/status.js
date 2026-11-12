/**
 * Public-safe diagnostic of one approved Sophia astronaut model.
 * Only boolean existence results for Sophia prefixes are returned.
 * Does not enumerate bucket contents to visitors.
 */
import { probeSophiaPublicR2 } from './rocket.js';

export async function onRequestGet({ env }) {
  const diagnostic = await probeSophiaPublicR2(env?.SHOREKEEPER_ASSETS_R2);
  const unavailable = diagnostic.state === 'binding_unavailable' ||
    diagnostic.state === 'storage_probe_failed';
  return new Response(JSON.stringify(diagnostic), {
    status: unavailable ? 503 : 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
