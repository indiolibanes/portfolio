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

function artworkUrl(template, size = 420) {
  if (!template) return null;
  return template
    .replace("{w}", String(size))
    .replace("{h}", String(size));
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
    const response = await fetch(
      "https://api.music.apple.com/v1/me/recent/played/tracks?limit=1",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Music-User-Token": userToken,
        },
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return Response.json(
        { ok: false, status: response.status, message: "Apple Music request failed.", detail },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const data = await response.json();
    const item = data?.data?.[0];
    const attributes = item?.attributes;

    if (!item || !attributes) {
      return Response.json(
        { ok: true, track: null },
        { headers: { "Cache-Control": "public, max-age=60" } },
      );
    }

    return Response.json(
      {
        ok: true,
        track: {
          id: item.id,
          name: attributes.name ?? "",
          artist: attributes.artistName ?? "",
          album: attributes.albumName ?? "",
          artwork: artworkUrl(attributes.artwork?.url, 420),
          url: attributes.url ?? null,
          durationInMillis: attributes.durationInMillis ?? null,
          releaseDate: attributes.releaseDate ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
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
