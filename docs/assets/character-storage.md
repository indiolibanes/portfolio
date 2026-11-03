# Character assets: public layout, R2 and protected originals

This document describes the state of the repository, not a verified Cloudflare dashboard. **No live R2 account/bucket access is available to the GitHub connector.**

## Public layout
\`\`\`
public/assets/characters/
  hsin/{models,animations,scenes,art}
  shorekeeper/{art,vfx}
  phrolova/{art,vfx}
  sophia/{models,art,2d}
\`\`\`
The 44 moved objects preserve their original Git blob SHA and byte sizes. Their previous URLs redirect permanently to the new locations via \`public/_redirects\`; every exported \`public/\` path is **still public**. The Hsin GLB is a Wuthering Waves asset and remains publicly readable. This regrouping is NOT a privacy migration.

## Protected library (intended future R2)
The key layout is described in [private-r2-layout.json](./private-r2-layout.json). No objects or prefixes were created remotely. A folder in R2 is a visualization of a common key prefix, not a separate resource.

1. In Cloudflare dashboard, create or select a **private** R2 bucket. Do not expose it through public buckets, public domains or r2.dev.
2. In the Pages project, configure a production R2 binding \`PORTFOLIO_PROTECTED_R2\` to that bucket (Settings → Bindings → Add → R2 bucket); repeat for preview only if justified. Re-deploy.
3. Before browser delivery, enforce an authorization mechanism (e.g. Cloudflare Access and validated identity in Pages Functions). Never return R2 objects to anonymous visitors through an unprotected endpoint. The browser cannot keep bytes secret once authorized delivery happens.
4. Upload local GLBs with a private machine and approved rights. Example **command shape only**, after configuring Wrangler (do not paste credentials into this repository):
\`\`\`sh
npx wrangler r2 object put YOUR_PRIVATE_BUCKET/characters/shorekeeper/models/shorekeeper-f20a-original-idles.glb --file ./PRIVATE_shorekeeper_f20a_original_idles.glb
\`\`\`
5. Verify SHA-256 of the local canonical file first: \`4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30\`, expected 39,487,548 bytes. Validate reading the R2 object in a **private test**, not by serving it through a public URL.
6. As of this change, Shorekeeper's browser UI still uses **local upload + IndexedDB**. No automatic R2 model loading is configured. The Hsin public model continues to load directly from Pages.

## Rights/credits
Shorekeeper, Hsin, Phrolova and Wuthering Waves © KURO GAMES. Attribution does not grant redistribution rights to extracted assets. The developer's Sophia assets may have distinct provenance, but still require source-by-source rights checks.

## Packaging to Google Drive
\`public-character-migration.json\`, \`private-r2-layout.json\`, this guide and the VFX authoring sources may be placed in a transport ZIP. **No private GLB/PSA source bytes are bundled in the repository**; include user-held proprietary files only in a separate private, rights-authorized transfer, never inside a public Git commit.
