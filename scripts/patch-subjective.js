// scripts/patch-subjective.js
// Minimal patch: ensure complaint + patientHistory go under Subjective, and send them in every payload.

const fs = require('fs');
const path = require('path');

function exists(p){ try{ fs.statSync(p); return true; } catch{ return false; } }
function read(p){ return fs.readFileSync(p, 'utf8'); }
function backup(p){ fs.copyFileSync(p, p + '.bak.' + Date.now()); }
function write(p, s){ backup(p); fs.writeFileSync(p, s, 'utf8'); console.log('Patched', p); }

const files = [
  'public/app.js',
  'public/generate-stable.js',
  'public/actions-stable.js',
];

// 1) Helper to enrich Subjective with complaint + patientHistory
const helperSnippet = `
/* === injected: complaint + patientHistory -> Subjective === */
(function(){
  if (window.enrichFromUI) return;
  window.enrichFromUI = function(p){
    try{
      var d = document;
      function get(id){
        var el = d.getElementById(id);
        return el ? String(('value' in el ? el.value : el.textContent) || '').trim() : '';
      }
      function first(ids){
        for (var i=0;i<ids.length;i++){ var v=get(ids[i]); if(v) return v; }
        return '';
      }
      function ensureStr(v){ return (typeof v==='string') ? v : (v ? String(v) : ''); }
      function setIfEmpty(o,k,val){ if(val && (o[k]==null || o[k]==='')) o[k]=val; }

      var complaint = first(['complaint','chiefComplaint','cc']);
      var history   = first(['patientHistory','hpi','history']);

      var subj = ensureStr(p.Subjective);
      if (complaint) subj += (subj ? '\\n' : '') + 'Chief Complaint: ' + complaint;
      if (history)   subj += (subj ? '\\n' : '') + 'History of Present Illness: ' + history;
      if (subj) p.Subjective = subj;

      setIfEmpty(p, 'complaint', complaint);
      setIfEmpty(p, 'hpi', history);

      return p;
    }catch(_){ return p; }
  };
})();
`;

// 2) Replace every JSON.stringify(payload) with an enriched version
//    We do NOT touch other JSON.stringify(...) forms (e.g., JSON.stringify({header:..., data:...}))
const payloadRe = /JSON\.stringify\s*\(\s*payload\s*\)/g;
const enriched = 'JSON.stringify(window.enrichFromUI ? window.enrichFromUI(payload) : payload)';

function patchAppJS(filePath){
  let s = read(filePath);
  let changed = false;

  // inject helper at top if missing
  if (!/window\.enrichFromUI/.test(s)) {
    s = helperSnippet + '\n' + s;
    changed = true;
    console.log('Injected helper into app.js');
  }

  // replace JSON.stringify(payload)
  if (payloadRe.test(s) && !s.includes(enriched)) {
    s = s.replace(payloadRe, enriched);
    changed = true;
  }

  if (changed) write(filePath, s);
  else console.log('No changes needed for', filePath);
}

function patchGeneric(filePath){
  let s = read(filePath);
  let changed = false;

  if (payloadRe.test(s) && !s.includes(enriched)) {
    s = s.replace(payloadRe, enriched);
    changed = true;
  }

  if (changed) write(filePath, s);
  else console.log('No changes needed for', filePath);
}

(function run(){
  const root = process.cwd();

  // app.js gets helper + replacement
  const appJs = path.join(root, 'public', 'app.js');
  if (exists(appJs)) patchAppJS(appJs); else console.log('Missing:', appJs);

  // other files get only the replacement
  for (const name of ['generate-stable.js','actions-stable.js']) {
    const p = path.join(root, 'public', name);
    if (exists(p)) patchGeneric(p); else console.log('Missing:', p);
  }

  console.log('Done.');
})();

