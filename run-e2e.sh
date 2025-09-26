#!/usr/bin/env bash
set -euo pipefail

PORT="${TEST_PORT:-5051}"
BASE="http://127.0.0.1:${PORT}"

NODE_ENV=test PORT="$PORT" node server.js >/dev/null 2>&1 & PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT

i=0
until curl -sf "$BASE/health" >/dev/null || [ $i -ge 100 ]; do i=$((i+1)); sleep 0.2; done
[ $i -lt 100 ] || { echo "health check failed"; exit 1; }

uuid() { node -e "try{console.log(require('crypto').randomUUID())}catch(e){console.log(Date.now().toString(36)+Math.random().toString(36).slice(2,10))}"; }

UUID="$(uuid)"
CREATED=0
for base in "/api/notes" "/notes"; do
  code=$(curl -sS -X PUT -H 'content-type: application/json' -d '{"noteType":"SOAP","text":"E2E create"}' -o /tmp/create.json -w '%{http_code}' "$BASE$base/$UUID" || true)
  if [ "$code" = "200" ] || [ "$code" = "201" ]; then NOTES_BASE="$base"; CREATED=1; break; fi
done
[ $CREATED -eq 1 ] || { echo "create via PUT /:uuid failed"; cat /tmp/create.json 2>/dev/null || true; exit 1; }

code=$(curl -sS -X PUT -H 'content-type: application/json' -d '{"text":"E2E updated","noteType":"SOAP"}' -o /tmp/update.json -w '%{http_code}' "$BASE$NOTES_BASE/${UUID}" || true)
[ "$code" = "200" ] || { echo "update failed $code"; cat /tmp/update.json; exit 1; }

FINALIZED=0
for method in POST PUT; do
  for path in "$NOTES_BASE/${UUID}/finalize" "/notes/${UUID}/finalize" "/api/notes/${UUID}/finalize" ; do
    code=$(curl -sS -X "$method" -o /tmp/finalize.json -w '%{http_code}' "$BASE$path" || true)
    if [ "$code" = "200" ] || [ "$code" = "409" ]; then FINALIZED=1; FINALIZE_METHOD="$method"; FINALIZE_PATH="$path"; FINALIZE_STATUS="$code"; break 2; fi
  done
done
[ $FINALIZED -eq 1 ] || { echo "finalize failed"; cat /tmp/finalize.json 2>/dev/null || true; exit 1; }

code=$(curl -sS -X PUT -H 'content-type: application/json' -d '{"text":"should fail"}' -o /tmp/lock.json -w '%{http_code}' "$BASE$NOTES_BASE/${UUID}" || true)
[ "$code" = "409" ] || { echo "immutability failed $code"; cat /tmp/lock.json; exit 1; }

PDF_OK=0
for p in "/notes/${UUID}/pdf?format=soap" "/api/notes/${UUID}/pdf?format=soap"; do
  code=$(curl -sS -D /tmp/pdf.hdr -o /tmp/note.pdf -w '%{http_code}' "$BASE$p" || true)
  if [ "$code" = "200" ]; then
    grep -i '^content-type: application/pdf' /tmp/pdf.hdr >/dev/null || { echo "pdf content-type bad"; exit 1; }
    head -c 4 /tmp/note.pdf | grep -q '%PDF' || { echo "pdf magic bad"; exit 1; }
    PDF_OK=1; PDF_PATH="$p"; break
  fi
done
[ $PDF_OK -eq 1 ] || { echo "pdf fetch failed"; cat /tmp/pdf.hdr 2>/dev/null || true; exit 1; }

echo "OK base=$NOTES_BASE uuid=$UUID finalize=$FINALIZE_METHOD $FINALIZE_PATH $FINALIZE_STATUS pdf=$PDF_PATH"
