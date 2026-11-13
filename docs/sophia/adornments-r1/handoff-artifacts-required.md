# Required files and acceptance contract — Work → Claude

## Facts at last remote audit
- GitHub PR #303 had six documentation files only; no actual Work pilot outputs were committed/published.
- Work independently reported a model-identity match, independent Book/Pen meshes, an intermediate socket pilot and 255 sampled poses. **The artifacts themselves are not available on the GitHub branch at the time of this report.**
- A local Work structural pilot is not a public/user-approved asset.

## Ask Work for a PRIVATE, versioned handoff archive (suggested structure, not assumed to exist)

```
sophia-adornments-r1b-handoff/
  manifest.json                # SHA256, source, tool versions, model+pilot links/IDs
  model-inventory.json         # meshes, node paths, skin, bones, morphs, clips, UVs, materials
  mesh-provenance.csv          # source mesh → extracted target & untouched source
  sockets.json                 # local matrices, parent bone, coordinate conventions
  collision-matrix.csv         # 255 poses plus contact and collision limits
  source-comparison.json       # body/rig/skin/animation+texture diffs
  source-match-report.md       # SHA256 equality proof for alpha vs archival 6H
  pilot/                       # exported real GLB/Blender outputs, with SHA256
  renders/                     # front/¾/profile/back + Write close-ups from real WebGL
  go-no-go.md                  # documented approved / pending / blocked pieces
```

The suggested path names are a request, not a claim that such files exist. If export cannot be provided, report `ARTIFACT_DELIVERY_BLOCKED` to owner.

## Validation table

| Criterion | Minimum proof | If absent |
|---|---|---|
| 6H source equivalence | Independently recomputed SHA256 and exact bytes from both files or preserved trusted report | `SOURCE_MATCH_UNVERIFIED` |
| Independent Book/Pen | Mesh node, UV, materials, actual 6H Write channels | `MESH_UNVERIFIED` |
| Reversible prop parenting | Source→socket→hand transform map | `SOCKET_UNVERIFIED` |
| 255-pose stability | Tests/reproduction script plus logs, representative frames | `POSE_QA_PENDING` |
| Contact correctness | WebGL hand/page/pen close-up, no collision | `CONTACT_PENDING` |
| Forehead C1 identity | Flat gold marking ON SKIN UNDER fringe | `STAR_IDENTITY_BLOCKED` |
| Astronaut untouched | No bytes/GLB/API/47 source clips changed | `ASTRONAUT_PRESERVED` |
| Public pages untouched | No automatic migration of /404, /curiosidades or /modo-imersivo | `NO_DEPLOY` |

## Confidentiality and branch
Keep candidate GLBs and reference packages in an owner-authorized private artifact channel, not public PR/Cloudflare deployment. GitHub documents may link to descriptions and checksums, not the raw private source archives. The existing published 6H file is already in repo; avoid copying it into a new 20 MB commit.

## Decision gate for Claude
Only **QA/integration harness** after provenance+pilot evidence. Full wardrobe or page migration is **NO_GO** until the user approves rendered character identity and garment skinning. No Tripo generation by default.
