#!/usr/bin/env bash
set -euo pipefail

TARGET="$(dirname "$(dirname "$(find ~/projects ~ -type f -name pinned_index.mjs 2>/dev/null | head -n1)")")"
[ -n "${TARGET}" ] || { echo "repo not found"; exit 1; }
cd "${TARGET}"

[ -f package.json ] || { echo "package.json not found in $(pwd)"; exit 1; }
[ -f server/pinned_index.mjs ] || { echo "server/pinned_index.mjs missing"; exit 1; }

node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.scripts=p.scripts||{};p.scripts.start='node server/pinned_index.mjs';if(p.dependencies){delete p.dependencies.cors;delete p.dependencies.pdfkit;}fs.writeFileSync('package.json',JSON.stringify(p,null,2));"

rm -f server/server server/pinned_index.mjs.bak.* pin_server.sh server/dev_static.mjs server.log .DS_Store || true
find . -name .DS_Store -delete || true

fix_one() {
  f="$1"
  [ -f "$f" ] || return 0
  tmp="$(mktemp)"
  echo '#!/usr/bin/env bash' > "$tmp"
  cat <<'HDR' >> "$tmp"
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
while [ ! -f package.json ] && [ "$PWD" != "/" ]; do cd ..; done
[ -f package.json ] || { echo "could not locate repo root"; exit 1; }
HDR
  tail -n +2 "$f" >> "$tmp"
  mv "$tmp" "$f"
  chmod +x "$f"
}

shopt -s nullglob || true
for f in *.sh; do fix_one "$f"; done
for f in server/*.sh; do fix_one "$f"; done 2>/dev/null || true

npm install
npm prune
