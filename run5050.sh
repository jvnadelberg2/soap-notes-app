#!/usr/bin/env zsh
set -euo pipefail
cd ~/projects/soap-notes-app
port=5050
pids=$(lsof -ti :$port || true)
if [ -n "$pids" ]; then kill -9 $pids || true; fi
npm run start:5050 &
srvpid=$!
for i in {1..80}; do
  if curl -sf "http://localhost:$port" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
echo "PID=$srvpid PORT=$port"
open "http://localhost:$port/?_v=$(date +%s)"
wait $srvpid
