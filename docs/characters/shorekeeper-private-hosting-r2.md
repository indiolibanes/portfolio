# Private Shorekeeper assets — where to host and how the existing website reads them

## Confirmed contract

- Cloudflare R2 bucket: `private-assets` (already chosen by the owner).
- Cloudflare Pages Functions binding variable: `SHOREKEEPER_ASSETS_R2`.
- Protection: `functions/_lib/shorekeeper-private.mjs` verifies Cloudflare Access JWT via `SK_ACCESS_TEAM_DOMAIN` and `SK_ACCESS_AUD`; missing settings respond 503, rejected access 403.
- Frontend only calls same-origin `GET /api/shorekeeper/manifest` and `GET /api/shorekeeper/asset?kind=model|library`.
- The published manifest is `characters/shorekeeper/manifests/current.json`. SHA-256, byte length and source MIME type are checked before accepting downloaded GLBs.

## R2 keys

```text
private-assets/
└── characters/
    └── shorekeeper/
        ├── models/
        │   └── shorekeeper-f20a-<hash>.glb
        ├── animations/
        │   ├── combat/
        │   │   ├── combat-basic-<hash>.glb
        │   │   ├── skill01-<hash>.glb
        │   │   ├── burst01-<hash>.glb
        │   │   └── burst02-<hash>.glb
        │   ├── idles/                 # optional private archives
        │   └── misc/                  # optional private archives
        ├── manifests/
        │   └── current.json
        ├── source-archive/             # R2-only archival backup; NOT exposed by existing API
        ├── reference-video/            # R2-only original video/GIF; NOT exposed by existing API
        └── qa-evidence/                # R2-only private PNG/MP4; NOT exposed by existing API
```

This is a suggested grouping; the real publisher creates content-addressed paths and manifest entries only under `models/` and `animations/combat/`. The *archive/reference/QA* prefixes are not reachable via the existing `/api/shorekeeper/asset` routes; they require Wrangler/local management or a separately reviewed authenticated endpoint. Store encrypted off-site backups as appropriate. No public bucket domain, public R2.dev, GitHub LFS, GitHub Release assets, GitHub Actions uploads or `public/` placement.

## Publish the model through the existing script

On a trusted local machine with credentials configured for the Cloudflare account:

```bash
npx wrangler login
npm ci
# Review/check the file and SHA without writing R2
npm run publish:shorekeeper -- --model "/PRIVATE/path/PRIVATE_shorekeeper_f20a_original_idles.glb" --dry-run
# Only for the FIRST publication when the current manifest does NOT exist:
npm run publish:shorekeeper -- --init --model "/PRIVATE/path/PRIVATE_shorekeeper_f20a_original_idles.glb"
# If current.json exists, omit --init:
npm run publish:shorekeeper -- --model "/PRIVATE/path/PRIVATE_shorekeeper_f20a_original_idles.glb"
```

The canonical file must have SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30` and size 39,487,548 bytes. The script uploads, downloads to a temporary location, verifies SHA-256, and only then publishes the new manifest atomically. An approved model update with a different SHA requires explicit `--allow-model-update` and should not be used casually.

## Seven combat sources versus four registered libraries

The private corpus contains four BasicAttack clips, Skill01 and two Bursts. As of this PR:
- `scripts/shorekeeper/publish-private-to-r2.mjs` rejects more than **four** `--library` entries.
- `functions/_lib/shorekeeper-private.mjs` and `src/scripts/shorekeeper/remote-private-model.mjs` both reject manifests with more than four libraries.
- Therefore do **not** upload seven independent combat files and expect the runtime to discover all of them.

Two safe options:
1. Assemble the four Attack01–04 clips into one validated animations-only GLB with the original clip names, preserving source rig path/semantics. Then use four library IDs, e.g. `basic`, `skill`, `burst01`, `burst02`. This requires offline validation that Three.js loads all seven original `AnimationClip` names from these four files.
2. In a separate draft, update **all** publisher, manifest schema validator, browser parser, import/loading, tests and memory budgets to allow at least seven library entries. Never patch only one limit.

Example *after* verifying bundling:

```bash
npm run publish:shorekeeper -- \
  --library basic="/PRIVATE/path/combat-basic-validated.animations.glb" \
  --library skill="/PRIVATE/path/SK_SKILL_01_ORIGINAL.animations.glb" \
  --library burst01="/PRIVATE/path/SK_BURST_01_ORIGINAL.animations.glb" \
  --library burst02="/PRIVATE/path/SK_BURST_02_ORIGINAL.animations.glb"
```

Verify `--dry-run` beforehand. No need to redeploy Pages after manifest promotion if binding and access are already correct and available at runtime; if configuring a new binding or changing deployment environment variables, redeploy the relevant Pages environment.

## Preview and Access

In Cloudflare dashboard: **Workers & Pages → Pages project kaue → Settings → Bindings → Add → R2 bucket**, variable name `SHOREKEEPER_ASSETS_R2`, select `private-assets`. Verify preview AND production bindings, because they can differ. Store `SK_ACCESS_TEAM_DOMAIN` and `SK_ACCESS_AUD` as protected environment variables, never in Git. The binding is not permission for anonymous browsers to read models: the Function verifies a valid Access JWT.

An already configured standalone Worker binding is not proof that the Pages Functions have the same binding. Verify using an authorized preview. A 403 means Access denied; a 503 may mean missing binding or Access configuration; a 404 may indicate missing manifest/object. Do not weaken auth just to fix a preview.

## Rights

These are copyrighted Wuthering Waves/KURO GAMES materials. A private bucket is only a technical containment mechanism; it does not grant publication or redistribution rights. For a public experimental page, prefer procedural original environment and privately loaded/locally imported models. Distributing proprietary GLBs to general visitors should wait for explicit rights clearance.
