const fs = require('fs');

function patchServer() {
  const p = 'server.js';
  if (!fs.existsSync(p)) { console.error(`[skip] ${p} not found`); return; }
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('middleware/json-error')) {
    console.log('[skip] server.js already has json-error');
    return;
  }
  if (/module\.exports\s*=\s*app\s*;/.test(s)) {
    s = s.replace(/module\.exports\s*=\s*app\s*;\s*$/m,
      'app.use(require("./middleware/json-error"));\n\nmodule.exports = app;');
  } else {
    s = s + '\napp.use(require("./middleware/json-error"));\n';
  }
  fs.writeFileSync(p, s);
  console.log('[patched] server.js -> json-error wired');
}

function patchNotesApi() {
  const p = 'routes/notes-api.js';
  if (!fs.existsSync(p)) { console.error(`[skip] ${p} not found`); return; }
  let s = fs.readFileSync(p, 'utf8');

  // Add import once
  if (!s.includes('require("../middleware/require-json")')) {
    s = s.replace(/(const\s+router\s*=\s*require\([^)]+\)\(\);)/,
      'const requireJSON = require("../middleware/require-json");\n$1');
  }

  // Insert requireJSON for PUT/POST/PATCH /notes and /notes/:uuid
  s = s.replace(
    /(router\.(?:put|post|patch)\s*\(\s*(['"`])\/notes(?:\/:uuid)?\2\s*,\s*)(?!requireJSON)/g,
    '$1requireJSON, '
  );

  fs.writeFileSync(p, s);
  console.log('[patched] routes/notes-api.js -> require-json wired');
}

patchServer();
patchNotesApi();
