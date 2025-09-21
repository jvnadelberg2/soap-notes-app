lsof -ti :5050 | xargs -r kill
sleep 2
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1
PORT="${PORT:-3002}"
NODE="$(command -v node)" || { echo node-not-found; exit 1; }
TARGET="$DIR/server/pinned_index.mjs"
[ -f "$TARGET" ] || { echo missing-server; exit 1; }
PIDS="$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  for PID in $PIDS; do
    CMD="$(ps -o command= -p "$PID" 2>/dev/null || true)"
    case "$CMD" in *"$TARGET"*) kill -TERM "$PID"; sleep 1; kill -0 "$PID" 2>/dev/null && kill -KILL "$PID" || true;; *) echo port-in-use:$PORT; exit 1;; esac
  done
fi
"$NODE" "$TARGET" > "$DIR/server.log" 2>&1 &
SPID=$!
for i in 1 2 3 4 5 6 7 8 9 10; do curl -sSf "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && break; sleep 1; done
if command -v open >/dev/null 2>&1; then open "http://127.0.0.1:$PORT/"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "http://127.0.0.1:$PORT/"; else printf "%s\n" "http://127.0.0.1:$PORT/"; fi
wait "$SPID"

