const LASTFM_ROOT = "https://ws.audioscrobbler.com/2.0/";
const UPSTREAM_TIMEOUT_MS = 5000;
const MAX_TEXT_LENGTH = 200;

// Only https URLs reach the browser, where they become <img src> and <a href>.
function httpsUrl(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function text(value) {
  return typeof value === "string" ? value.slice(0, MAX_TEXT_LENGTH) : "";
}

function largestImage(images = []) {
  const candidates = Array.isArray(images) ? images : [];
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const url = httpsUrl(candidates[i]?.["#text"]);
    if (url) return url;
  }
  return null;
}

function normalizeTrack(track) {
  if (!track) return null;

  const nowPlaying = track?.["@attr"]?.nowplaying === "true";
  const playedAt = track?.date?.uts
    ? Number(track.date.uts) * 1000
    : null;

  return {
    name: text(track?.name),
    artist: text(track?.artist?.["#text"] ?? track?.artist?.name),
    album: text(track?.album?.["#text"]),
    artwork: largestImage(track?.image),
    url: httpsUrl(track?.url),
    nowPlaying,
    playedAt,
    mbid: track?.mbid || null,
  };
}

async function getCached(request) {
  try {
    return await caches.default.match(request);
  } catch {
    return null;
  }
}

async function putCached(request, response) {
  try {
    await caches.default.put(request, response);
  } catch {
    // Cache API is optional in local development.
  }
}

export async function onRequestGet(context) {
  const username = context.env.LASTFM_USERNAME;
  const apiKey = context.env.LASTFM_API_KEY;

  if (!username || !apiKey) {
    return Response.json(
      {
        ok: false,
        configured: false,
        message: "Last.fm credentials are not configured.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  // Key the edge cache on the path alone, so "?x=1" cannot bypass it and
  // turn every visitor request into a Last.fm API call.
  const cacheUrl = new URL(context.request.url);
  cacheUrl.search = "";
  const cacheRequest = new Request(cacheUrl.toString(), {
    method: "GET",
  });

  const cached = await getCached(cacheRequest);
  if (cached) return cached;

  try {
    const url = new URL(LASTFM_ROOT);
    url.searchParams.set("method", "user.getrecenttracks");
    url.searchParams.set("user", username);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("extended", "1");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Kaue-Alencar-Portfolio/1.0",
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const data = await response.json();

    if (!response.ok || data?.error) {
      // Last.fm's own error text can reveal account or key state; keep it
      // out of a public response.
      return Response.json(
        {
          ok: false,
          message: "Last.fm request failed.",
        },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const rawTracks = data?.recenttracks?.track;
    const firstTrack = Array.isArray(rawTracks)
      ? rawTracks[0]
      : rawTracks;

    const track = normalizeTrack(firstTrack);

    const output = Response.json(
      {
        ok: true,
        source: "last.fm",
        user: data?.recenttracks?.["@attr"]?.user ?? username,
        track,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=45, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );

    context.waitUntil?.(putCached(cacheRequest, output.clone()));

    return output;
  } catch {
    return Response.json(
      {
        ok: false,
        message: "Last.fm is unavailable.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
