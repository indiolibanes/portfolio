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

async function createDeveloperToken(env, origin) {
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
    origin: [origin],
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

export async function onRequestGet(context) {
  try {
    const origin = new URL(context.request.url).origin;
    const developerToken = await createDeveloperToken(context.env, origin);

    return Response.json(
      { ok: true, developerToken },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
