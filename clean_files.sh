#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
while [ ! -f package.json ] && [ "$PWD" != "/" ]; do cd ..; done
[ -f package.json ] || { echo "repo root not found"; exit 1; }
rm -f server/server server/pinned_index.mjs.bak.* server/dev_static.mjs server.log pin_server.sh repo_fix.sh cleanup_unused.sh public/index.html start.sh 2>/dev/null || true
find . -name .DS_Store -delete || true
echo "Cleanup complete in $PWD"
