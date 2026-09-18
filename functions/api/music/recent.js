const LASTFM_ROOT = "https://ws.audioscrobbler.com/2.0/";

function largestImage(images = []) {
  const candidates = Array.isArray(images) ? images : [];
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const url = candidates[i]?.["#text"];
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
    name: track?.name ?? "",
    artist: track?.artist?.["#text"] ?? track?.artist?.name ?? "",
    album: track?.album?.["#text"] ?? "",
    artwork: largestImage(track?.image),
    url: track?.url ?? null,
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

  const cacheRequest = new Request(context.request.url, {
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
    });

    const data = await response.json();

    if (!response.ok || data?.error) {
      return Response.json(
        {
          ok: false,
          message: data?.message || "Last.fm request failed.",
          error: data?.error ?? response.status,
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
          "Cache-Control": "public, max-age=45, stale-while-revalidate=120",
        },
      },
    );

    context.waitUntil?.(putCached(cacheRequest, output.clone()));

    return output;
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unexpected Last.fm error.",
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
