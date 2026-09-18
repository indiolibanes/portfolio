const encoder = new TextEncoder();

function base64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem) {
  const clean = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function developerToken(env) {
  const { APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = env;
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    throw new Error("Apple Music developer credentials are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(encoder.encode(JSON.stringify({
    alg: "ES256",
    kid: APPLE_KEY_ID,
  })));
  const payload = base64Url(encoder.encode(JSON.stringify({
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: now + 3600,
  })));
  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(APPLE_PRIVATE_KEY),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(signingInput),
  );

  return `${signingInput}.${base64Url(signature)}`;
}

function artworkUrl(template, size = 520) {
  if (!template) return null;
  return template
    .replace("{w}", String(size))
    .replace("{h}", String(size));
}

async function appleFetch(path, token, userToken) {
  return fetch(`https://api.music.apple.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Music-User-Token": userToken,
    },
  });
}

export async function onRequestGet(context) {
  try {
    const userToken = context.env.APPLE_MUSIC_USER_TOKEN;
    if (!userToken) {
      return Response.json(
        { ok: false, configured: false, message: "Music User Token not configured." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const token = await developerToken(context.env);

    const storefrontResponse = await appleFetch("/v1/me/storefront", token, userToken);
    if (!storefrontResponse.ok) {
      return Response.json(
        { ok: false, message: "Could not resolve Apple Music storefront." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const storefrontData = await storefrontResponse.json();
    const storefront = storefrontData?.data?.[0]?.id;

    if (!storefront) {
      return Response.json(
        { ok: true, playlists: [] },
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    }

    const publicIds = [];
    let next = "/v1/me/library/playlists?limit=25";
    let page = 0;

    while (next && page < 5 && publicIds.length < 12) {
      const response = await appleFetch(next, token, userToken);
      if (!response.ok) break;

      const body = await response.json();

      for (const playlist of body?.data ?? []) {
        const attrs = playlist?.attributes;
        const globalId = attrs?.playParams?.globalId;

        if (attrs?.isPublic === true && attrs?.hasCatalog === true && globalId) {
          publicIds.push(globalId);
          if (publicIds.length >= 12) break;
        }
      }

      next = body?.next ?? null;
      page += 1;
    }

    if (!publicIds.length) {
      return Response.json(
        { ok: true, playlists: [] },
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    }

    const catalogUrl = new URL(
      `https://api.music.apple.com/v1/catalog/${encodeURIComponent(storefront)}/playlists`,
    );
    catalogUrl.searchParams.set("ids", publicIds.slice(0, 6).join(","));

    const catalogResponse = await fetch(catalogUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!catalogResponse.ok) {
      return Response.json(
        { ok: true, playlists: [] },
        { headers: { "Cache-Control": "public, max-age=300" } },
      );
    }

    const catalogData = await catalogResponse.json();
    const playlists = (catalogData?.data ?? []).map((playlist) => ({
      id: playlist.id,
      name: playlist.attributes?.name ?? "",
      curator: playlist.attributes?.curatorName ?? "Kauê Alencar",
      artwork: artworkUrl(playlist.attributes?.artwork?.url, 520),
      url: playlist.attributes?.url ?? null,
      description: playlist.attributes?.description?.short
        ?? playlist.attributes?.description?.standard
        ?? "",
    }));

    return Response.json(
      { ok: true, playlists },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
