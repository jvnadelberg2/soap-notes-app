set -e
P="$(pwd)"
PIDS="$(lsof -tiTCP:5050 || true)"; [ -n "$PIDS" ] && kill -9 $PIDS || true

perl -0777 -i -pe 's|<style>.*?</style>|<style>:root{color-scheme:light}body{background:#fff;color:#111;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}.page{max-width:1280px;margin:20px auto;padding:0 12px}.grid{display:grid;gap:16px}.grid-2{grid-template-columns:1fr 1fr}@media(max-width:900px){.grid-2{grid-template-columns:1fr}}.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}.card h3{margin:0;padding:12px 14px;border-bottom:1px solid #eee;font-size:15px;color:#111}.card .body{padding:14px}.row{display:grid;gap:12px}.row-2{grid-template-columns:1fr 1fr}@media(max-width:720px){.row-2{grid-template-columns:1fr}}label{font-size:12px;color:#374151;display:block;margin-bottom:6px}input[type="text"],textarea,select{width:100%;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#111;font-size:14px}textarea{min-height:110px;resize:vertical}.hint{font-size:12px;color:#6b7280}.button{border-radius:8px;padding:10px 14px;border:1px solid #e5e7eb;cursor:pointer;font-weight:600;background:#fff}pre#soapTextOut{min-height:240px;background:#fff;color:#111;border:1px solid #e5e7eb;border-radius:8px;padding:12px;white-space:pre-wrap;word-break:break-word;margin:0;max-height:60vh;overflow:auto}#icdOut{min-height:120px}textarea#rawText{min-height:560px}</style>|s' public/index.html

perl -0777 -i -pe 's/^\s*document\.addEventListener\(\s*'\''DOMContentLoaded'\'',\s*function\(\)\{\s*var\s+root=document\.querySelector\('\''\.grid\.grid-2'\''\)[\s\S]*?\}\);\s*//m' public/app.js
perl -0777 -i -pe 's/^\s*document\.addEventListener\(\s*'\''DOMContentLoaded'\'',\s*function\(\)\{\s*var\s+icd=document\.getElementById\('\''icdOut'\''\)[\s\S]*?\}\);\s*//m' public/app.js
perl -0777 -i -pe 's/\(function\(\)\{if\(window\.__icdInit\)return;[\s\S]*?\}\)\(\);\s*//m' public/app.js
perl -0777 -i -pe 's/;\(function\(\)\{\s*if\s*\(\s*window\.__ICD_DEBOUNCE_V3__\s*\)\s*return;[\s\S]*?}\)\s*,\s*450\);\s*\}\);\s*\}\)\(\);\s*//m' public/app.js

PORT=5050 npm start
