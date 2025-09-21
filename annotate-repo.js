const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const ROOT = process.cwd();
const OUT_ARCH = path.join(ROOT, 'docs', 'ARCHITECTURE.md');
const FILE_MARK = 'BEGIN:ARCH-COMMENT';
const JS_RX_ENDPOINT = /\b(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*([`'"])(.*?)\2/gi;
const JS_RX_EXPORT_KEYS = /module\.exports\s*=\s*\{([\s\S]*?)\}/m;
const JS_RX_EXPORTS = /\bexports\.(\w+)\s*=/g;
const JS_RX_REQUIRE_JSON = /require\(['"`].*require-json['"`]\)/;
const JS_RX_JSON_ERROR = /require\(['"`].*json-error['"`]\)/;
const JS_RX_STORE = /require\(['"`].*services\/store['"`]\)/;
const JS_RX_PDF = /require\(['"`].*services\/pdf['"`]\)/;
const JS_RX_SIGN = /require\(['"`].*services\/signature['"`]\)/;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function listTargets() {
  const t = [];
  ['server.js','routes','services','middleware','public'].forEach(p=>{
    const full = path.join(ROOT, p);
    if (!fs.existsSync(full)) return;
    if (fs.statSync(full).isFile()) t.push(full);
    else t.push(...walk(full));
  });
  return t.filter(p=>{
    const ext = path.extname(p).toLowerCase();
    return ext === '.js' || ext === '.mjs' || ext === '.html';
  });
}

function commentBlock(kind, text) {
  if (kind === 'html') return `<!-- ${FILE_MARK}\n${text}\nEND:${FILE_MARK} -->\n`;
  return `/* ${FILE_MARK}\n${text}\nEND:${FILE_MARK} */\n`;
}

function hasMarker(src) {
  return src.includes(FILE_MARK);
}

function summarizeJS(file, src) {
  const endpoints = [];
  let m;
  while ((m = JS_RX_ENDPOINT.exec(src))) {
    endpoints.push(`${m[1].toUpperCase()} ${m[3]}`);
  }
  const exportKeys = [];
  const ek = JS_RX_EXPORT_KEYS.exec(src);
  if (ek) {
    const keys = ek[1].split('\n').map(l=>l.trim()).filter(Boolean);
    keys.forEach(k=>{
      const nm = k.split(':')[0].replace(/[, ]+$/,'').trim();
      if (nm) exportKeys.push(nm);
    });
  }
  let ex;
  while ((ex = JS_RX_EXPORTS.exec(src))) exportKeys.push(ex[1]);

  const usesRequireJSON = JS_RX_REQUIRE_JSON.test(src);
  const usesJsonError = JS_RX_JSON_ERROR.test(src);
  const usesStore = JS_RX_STORE.test(src);
  const usesPDF = JS_RX_PDF.test(src);
  const usesSign = JS_RX_SIGN.test(src);

  const hints = [];
  if (usesRequireJSON) hints.push('Content-Type=application/json enforced (415 on wrong type).');
  if (usesJsonError) hints.push('Consistent JSON error responses.');
  if (usesStore) hints.push('Persists via services/store.');
  if (usesPDF) hints.push('Generates PDFs via services/pdf.');
  if (usesSign) hints.push('Signs/validates via services/signature.');
  if (endpoints.length === 0 && /module\.exports/.test(src)) hints.push('Exports a module API.');

  const text = [
    `File: ${path.relative(ROOT, file)}`,
    `Purpose: High-level description of this module in the SOAP/BIRP notes app.`,
    endpoints.length ? `Endpoints: ${endpoints.join(', ')}` : `Endpoints: none detected`,
    exportKeys.length ? `Exports: ${exportKeys.join(', ')}` : `Exports: none detected`,
    hints.length ? `Notes: ${hints.join(' ')}` : `Notes:`,
    `Security: Applies middleware where wired; follow immutability rules for finalized notes.`,
    `Observability: Increment metrics where relevant; return JSON errors.`,
  ].join('\n');
  return text;
}

function summarizeHTML(file, src) {
  const title = (src.match(/<title>(.*?)<\/title>/i)||[])[1] || 'UI Document';
  return [
    `File: ${path.relative(ROOT, file)}`,
    `Purpose: ${title} page in the SOAP/BIRP UI.`,
    `Notes: Contains UI code that interacts with API routes; ensure buttons are disabled during in-flight actions and Draft/Final states are visible.`,
  ].join('\n');
}

function writeHeader(file, src) {
  const ext = path.extname(file).toLowerCase();
  const kind = ext === '.html' ? 'html' : 'js';
  const body = kind === 'js' ? summarizeJS(file, src) : summarizeHTML(file, src);
  const block = commentBlock(kind, body);
  return block + src;
}

function ensureDir(p) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function buildArchitecture(files, perFileInfo) {
  const lines = [];
  lines.push('# System Architecture');
  lines.push('');
  lines.push('## Request Flow');
  lines.push('UI (public/*) → API (routes/*, server.js) → Services (store/pdf/signature) → Responses (JSON/PDF) → Metrics (/admin/metrics)');
  lines.push('');
  lines.push('## Endpoints (discovered)');
  const eps = [];
  for (const [f, info] of perFileInfo) {
    if (!info || !info.endpoints) continue;
    info.endpoints.forEach(e=>eps.push(`${e}  —  ${path.relative(ROOT,f)}`));
  }
  if (eps.length === 0) lines.push('- none detected');
  else {
    const uniq = Array.from(new Set(eps)).sort();
    uniq.forEach(e=>lines.push(`- ${e}`));
  }
  lines.push('');
  lines.push('## Modules');
  lines.push('- Routes: routes/*');
  lines.push('- Services: services/* (store, pdf, signature, key-health)');
  lines.push('- Middleware: middleware/* (require-json, json-error, inflight-lock)');
  lines.push('- Observability: /admin/metrics');
  lines.push('- Health: /health, Readiness: /ready (planned)');
  lines.push('');
  lines.push('## Security and Integrity');
  lines.push('- Content-Type enforcement (415) on JSON routes; JSON error model; finalized notes immutable.');
  lines.push('- Signatures: finalized payloads signed (RSASSA-PSS); hashes recorded.');
  lines.push('');
  return lines.join('\n');
}

function collectInfoJS(src) {
  const endpoints = [];
  let m;
  while ((m = JS_RX_ENDPOINT.exec(src))) endpoints.push(`${m[1].toUpperCase()} ${m[3]}`);
  return { endpoints };
}

(function main(){
  const files = listTargets();
  const perFileInfo = new Map();

  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (hasMarker(src)) continue;
    const ext = path.extname(f).toLowerCase();
    if (ext === '.js' || ext === '.mjs') perFileInfo.set(f, collectInfoJS(src));
  }

  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (hasMarker(src)) continue;
    const newSrc = writeHeader(f, src);
    if (DRY) {
      process.stdout.write(`[DRY] would annotate: ${path.relative(ROOT,f)}\n`);
    } else {
      fs.writeFileSync(f, newSrc, 'utf8');
      process.stdout.write(`[annotated] ${path.relative(ROOT,f)}\n`);
    }
  }

  ensureDir(OUT_ARCH);
  const arch = buildArchitecture(files, perFileInfo);
  if (!DRY) fs.writeFileSync(OUT_ARCH, arch, 'utf8');
  else process.stdout.write(`[DRY] would write ${path.relative(ROOT,OUT_ARCH)}\n`);
})();
