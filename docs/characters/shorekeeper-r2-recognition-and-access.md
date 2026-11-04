# Shorekeeper — R2 recognition and access contract (2026-11-04)

## What was verified

- Local upload package from the owner: canonical F2.0-A (39,487,548 B; SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`), `basic` (4 source attacks), `advanced` (4 source moves) and `burst` (two original Bursts). Each of the three grouped animation-only GLBs has `skCombatLibrary:2.1-c`, 249 armature nodes, zero meshes/skins/images and preserves `_ORIGINAL`, `_BODY`, `_RIB` clips.
- The provided `current.json` uses schema `shorekeeper-private-assets/v1` and references those three library objects; under the current maximum of four libraries.
- These checks are **local package checks, not proof that remote R2 objects are present or that Access works**. The browser must establish those independently.
- No modified GLB, PSA, image, private reference media, upload token or Cloudflare credential is committed.

## Runtime / UI

- The existing code already fetched `/api/shorekeeper/manifest` and `/api/shorekeeper/asset` automatically. It hid the reason for failed manifest reads behind `null`.
- The new manual acervo panel separates `ready`, `denied` (401/403), `unconfigured` (503), `missing` (404), `invalid`, `unavailable` and `network`, without emitting JWT, R2 keys or secrets.
- It reports **model SHA and real loaded clip counts**: Basic 4/4, Advanced 4/4 and Burst 2/2. Manifest presence does not count as successful library loading.
- The explicit refresh button only downloads through authorized same-origin endpoints after validating the manifest. It can load the canonical model when no other model is present, but refuses to replace a different manually loaded model. It reloads libraries whose SHA changed and supports cancellation of a previous attempt.
- Original Burst 01/02 launchers operate the existing body/animation ownership and require the original source clip to be recognized; no claims about authentic VFX-to-PSA cue markers or physically validated landings. VFX remains a separate procedural system.

## What is where

- **Model** — R2: `private-assets/characters/shorekeeper/models/`, current canonical F2.0-A.
- **Combat body animations** — R2: `private-assets/characters/shorekeeper/animations/combat/`, three grouped, validated glTF 2.0 source libraries.
- **Metadata** — R2: `private-assets/characters/shorekeeper/manifests/current.json`; publishing it last atomically exposes the new immutable object keys.
- **Procedural atmospheric effects** — TypeScript/JavaScript in `src/scripts/shorekeeper/vfx-r2.mjs` through `vfx-r5.mjs`, `celestial-environment-r5.mjs`, `vfx-narrative.mjs`; served with the public code build. These scripts generate butterfly swarms, Collapsed Core, celestial sky, rings and ruins. They are authored approximations, **not copied KURO game FX files**.

## Pages configuration (no desktop required)

In Cloudflare Dashboard → Workers & Pages → Pages project `kaue` → Settings → Bindings, ensure the **Pages** `SHOREKEEPER_ASSETS_R2` R2 binding selects `private-assets` in both Preview and Production as applicable. The binding on an unrelated Worker is not inherited. After changing bindings, redeploy the Pages environment.

Under Settings → Environment variables/secrets, set `SK_ACCESS_TEAM_DOMAIN` (your actual `https://<team>.cloudflareaccess.com` issuer) and `SK_ACCESS_AUD` (the audience tag for your Access application) as protected values. Do not add credentials to source code or the chat. Validate owner-only Cloudflare Access policy for the preview and production domain in question. The existing Pages Functions reject requests without those values, and verify the signed `CF_Authorization`/Access token; a hidden URL is not an access control.

The browser's logged-in Access session must cover the **same origin** it uses for manifest and asset requests. For a new Pages preview hostname this may require including the preview app in Access or using the stable authorized branch/domain. Failing closed is intentional.

No redeploy is needed when updating objects and `current.json` only, as long as existing Pages Functions and bindings are unchanged. After editing code, functions or binding/environment settings, rebuild/redeploy.

## Future management / editing

- **Pages runtime** reads through its binding and does not expose R2 object write or list routes to normal visitors.
- **ChatGPT Github connector** can edit code/manifest templates; it does not grant direct access to your R2 bucket. This session has no verified writable Cloudflare R2 connection.
- For mobile/Work automation, safest next extension is a **separate authenticated admin upload interface**, protected by Cloudflare Access identity AND strong CSRF/origin checks, strict allowlisted prefix, versioned immutable keys, SHA-256 verification, upload-size limits, confirmation before manifest promotion, and rollback. Do not expose a generic write/DELETE endpoint under `/api/shorekeeper/asset`; do not commit or paste R2 tokens. Alternative: temporary presigned PUT URLs generated server-side for explicitly approved keys only, with strict expiry and one-operation scope.
- If an agent later obtains a connected Cloudflare provider/Work browser, use only revocable, narrowly scoped permissions and require explicit review for writes. Never equate Pages binding with a ChatGPT credential.

## QA gates

1. Empty session unauthenticated: 403 (or 503 if binding/access config is incomplete), not raw asset bytes; show status.
2. Authenticated same-origin preview: 200 manifest, canonical GLB SHA + sizes, Basic 4/4, Advanced 4/4, Burst 2/2 after loading. No object public domain and no data in public/dist.
3. Trigger Burst01, Burst02 manually in reference mode, return to idle; compare motion/body turns. No automatic VFX sync claim.
4. Switch OFF/AMBIENT/STELLAREALM/RESONANCE_PEAK; verify reduced motion, performance, context loss and disposal.
5. On Samsung Internet, verify local privacy fallback and 600 seconds of actual device behavior; no performance certification from SwiftShader/CI.
