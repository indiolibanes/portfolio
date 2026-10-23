// Same-origin proxy for Last.fm album covers, so the page can read the pixels
// (canvas analysis needs a CORS-clean image) and ask for the larger original.
// Strictly allow-listed: one CDN host, one path prefix, images only, size capped.
const ALLOWED_HOST = "lastfm.freetls.fastly.net";
const ALLOWED_PREFIX = "/i/u/";
const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 5000;

function sizeVariants(url) {
  // Last.fm serves any size by path: "ar0" is the uploaded original.
  const original = url.pathname.replace(/^\/i\/u\/[^/]+\//, "/i/u/ar0/");
  if (original === url.pathname) return [url];
  const big = new URL(url);
  big.pathname = original;
  return [big, url];
}

export async function onRequestGet(context) {
  const raw = new URL(context.request.url).searchParams.get("u");
  let target;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (target.protocol !== "https:" || target.hostname !== ALLOWED_HOST || !target.pathname.startsWith(ALLOWED_PREFIX) || target.username || target.password || target.port) {
    return new Response("Forbidden", { status: 403 });
  }
  target.search = "";

  for (const candidate of sizeVariants(target)) {
    try {
      const upstream = await fetch(candidate, {
        headers: { Accept: "image/*", "User-Agent": "Kaue-Alencar-Portfolio/1.0" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "error",
      });
      const type = upstream.headers.get("content-type") ?? "";
      const length = Number(upstream.headers.get("content-length") ?? 0);
      if (!upstream.ok || !type.startsWith("image/") || type.includes("svg") || length > MAX_BYTES) continue;
      const body = await upstream.arrayBuffer();
      if (body.byteLength > MAX_BYTES) continue;
      return new Response(body, {
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      // try the next size, then give up
    }
  }
  return new Response("Cover unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
}
