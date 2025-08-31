set -euo pipefail
PORT="${PORT:-5050}"
SERVER="server.js"
APP="public/app.js"
[ -f "$SERVER" ] || { echo "server.js not found"; exit 1; }
mkdir -p public
touch "$APP"

perl -0777 -i -pe '
  s/^\s*import\s+.*express-slow-down.*\n//mg;
  s/^\s*import\s+.*express-rate-limit.*\n//mg;
  s/^\s*const\s+icdSlow\s*=.*\n//mg;
  s/^\s*const\s+icdLimiter\s*=.*\n//mg;
  s/^\s*app\.use\(\s*"\/api\/icd-suggest"\s*,\s*icdSlow\s*\)\s*;?\n//mg;
  s/^\s*app\.use\(\s*"\/api\/icd-suggest"\s*,\s*icdLimiter\s*\)\s*;?\n//mg;
  s/\n?const __ICD_GUARD__[\s\S]*?app\.use\(__icdGuard\);\n?//g;
' "$SERVER"

perl -0777 -i -pe '
  s/;\(function\(\)\{\s*if\s*\(window\.__ICD_DEBOUNCE__\)[\s\S]*?\}\)\(\);\n?//g;
  s/;\(function\(\)\{\s*if\s*\(window\.__ICD_DEBOUNCE_V3__\)[\s\S]*?\}\)\(\);\n?//g;
' "$APP"

cat >> "$APP" <<'JS'
;(function(){
  if (window.__ICD_DEBOUNCE_V3__) return; window.__ICD_DEBOUNCE_V3__ = true;
  var input = document.getElementById("complaint");
  if (!input) return;
  var timer = 0, last = "", ctrl = null;
  input.addEventListener("input", function(){
    var q = (input.value || "").trim();
    if (q.length < 4) { last = ""; return; }
    if (q === last) return;
    clearTimeout(timer);
    timer = setTimeout(function(){
      last = q;
      try { if (ctrl) ctrl.abort(); } catch(e) {}
      ctrl = new AbortController();
      fetch("/api/icd-suggest", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ text: q }),
        signal: ctrl.signal
      }).catch(function(){});
    }, 450);
  }, { passive: true });
})();
JS

npm pkg delete dependencies.express-rate-limit >/dev/null 2>&1 || true
npm pkg delete dependencies.express-slow-down >/dev/null 2>&1 || true
npm rm express-rate-limit express-slow-down >/dev/null 2>&1 || true

if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -tiTCP:$PORT || true)"; [ -n "$PIDS" ] && kill -9 $PIDS || true
fi

npm install --silent
PORT="$PORT" npm start
