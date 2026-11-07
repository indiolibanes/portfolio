import {checkPrivateAccess, PRIVATE_HEADERS} from '../../_lib/shorekeeper-private.mjs';

// Protect the *HTML*, not just the private GLB endpoints. A hidden URL is not access control.
// This route is a private rehearsal, never an anonymous fallback to the guest's assets.
export async function onRequest(context) {
  const denied = await checkPrivateAccess(context.request, context.env);
  if (denied) {
    const headers = new Headers(denied.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return new Response(denied.body, {status: denied.status, headers});
  }
  if (!['GET', 'HEAD'].includes(context.request.method)) {
    return new Response(null, {status: 405, headers: {...PRIVATE_HEADERS, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}});
  }
  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(context.request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
