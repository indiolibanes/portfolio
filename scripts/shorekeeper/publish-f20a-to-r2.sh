#!/usr/bin/env bash
# Public serving of an extracted third-party game GLB may require the rights holder's permission.
# Do not use a personal/private Obsidian bucket; use a dedicated, separately bound R2 bucket.
set -euo pipefail
if [[ $# -ne 2 ]]; then
  echo "Usage: $0 /path/PRIVATE_shorekeeper_f20a_original_idles.glb dedicated-r2-bucket-name" >&2
  exit 2
fi
model="$1"
bucket="$2"
if [[ ! -f "$model" ]]; then echo "GLB not found: $model" >&2; exit 1; fi
python3 - "$model" <<'PY'
import hashlib,os,sys,struct,json
p=sys.argv[1]; size=os.path.getsize(p)
required_size=39487548
required_sha="4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30"
if size!=required_size: raise SystemExit(f"WRONG SIZE: {size} != {required_size}")
h=hashlib.sha256()
with open(p,"rb") as f:
    while block:=f.read(2**20): h.update(block)
if h.hexdigest()!=required_sha: raise SystemExit(f"WRONG SHA-256: {h.hexdigest()}")
with open(p,"rb") as f:
    header=f.read(12)
magic,version,length=struct.unpack("<III",header)
if (magic,version,length)!=(0x46546c67,2,size):raise SystemExit("Invalid GLB header")
print("Verified exact F2.0-A model: 39,487,548 bytes and SHA-256 match")
PY
key="models/shorekeeper/shorekeeper-f20a-original-idles.glb"
echo "Uploading to R2: $bucket/$key (public site access after opt-in)"
npx wrangler r2 object put "$bucket/$key" --file "$model" --content-type "model/gltf-binary" --remote
echo "R2 upload completed. Bind the bucket as SHOREKEEPER_ASSETS_R2 and enable SHOREKEEPER_MODEL_PUBLIC=true on Pages, then redeploy."
