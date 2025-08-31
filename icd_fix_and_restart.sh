set -euo pipefail
SERVER="server.js"
APP="public/app.js"
[ -f "$SERVER" ] || { echo "server.js not found"; exit 1; }
mkdir -p public
cp -n "$SERVER" "$SERVER.bak.$(date +%s)" || true
cp -n "$APP" "$APP.bak.$(date +%s)" || true

grep -q "__ICD_GUARD__" "$SERVER" || cat >> "$SERVER" <<'SJS'
const __ICD_GUARD__ = true;
const __icdHits = new Map();
function __icdGuard(req,res,next){
  if (req.path !== "/api/icd-suggest") return next();
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "local");
  const now = Date.now();
  const slot = Math.floor(now/10000);
  const key = ip + ":" + slot;
  const n = (__icdHits.get(key) || 0) + 1;
  __icdHits.set(key, n);
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) return next();
  if (n > 30) return res.status(429).end();
  if (n > 10) return setTimeout(next, (n - 10) * 150);
  return next();
}
app.use(__icdGuard);
SJS

touch "$APP"
grep -q "__ICD_DEBOUNCE__" "$APP" || cat >> "$APP" <<'AJS'
;(function(){
  if (window.__ICD_DEBOUNCE__) return; window.__ICD_DEBOUNCE__ = true;
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
      try{ if (ctrl) ctrl.abort(); }catch(e){}
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
AJS

echo "✅ ICD fixes applied — restarting on port 5050..."
PORT=5050 npm start
