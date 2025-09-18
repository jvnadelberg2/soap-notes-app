// scripts/patch-subjective.mjs
// ESM-compatible patcher for complaint + patientHistory -> Subjective and payload enrichment.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const root       = path.resolve(__dirname, '..');

function exists(p){ try{ fs.statSync(p); return true; } catch{ return false; } }
function read(p){ return fs.readFileSync(p, 'utf8'); }
function backup(p){ fs.copyFileSync(p, p + '.bak.' + Date.now()); }
function write(p, s){ backup(p); fs.writeFileSync(p, s, 'utf8'); console.log('Patched', p); }

// minimal helper that adds complaint/history to Subjective and sets complaint/hpi
const helperSnippet = `/* === injected: complaint + patientHistory -> Subjective === */
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
})();\n`;

const payloadRe = /JSON\.stringify\s*\(\s*payload\s*\)/g;
const enriched  = 'JSON.stringify(window.enrichFromUI ? window.enrichFromUI(payload) : payload)';

function patchAppJS(filePath){
  let s = read(filePath);
  let changed = false;

  if (!/window\.enrichFromUI/.test(s)) {
    s = helperSnippet + s;
    changed = true;
    console.log('Injected helper into app.js');
  }
  if (payloadRe.test(s) && !s.includes(enriched)) {
    s = s.replace(payloadRe, enriched);
    changed = true;
  }
  if (changed) write(filePath, s); else console.log('No changes needed for', filePath);
}

function patchGeneric(filePath){
  if (!exists(filePath)) { console.log('Missing:', filePath); return; }
  let s = read(filePath);
  let changed = false;
  if (payloadRe.test(s) && !s.includes(enriched)) {
    s = s.replace(payloadRe, enriched);
    changed = true;
  }
  if (changed) write(filePath, s); else console.log('No changes needed for', filePath);
}

(function run(){
  const appJs = path.join(root, 'public', 'app.js');
  if (exists(appJs)) patchAppJS(appJs); else console.log('Missing:', appJs);
  patchGeneric(path.join(root, 'public', 'generate-stable.js'));
  patchGeneric(path.join(root, 'public', 'actions-stable.js'));
  console.log('Done.');
})();

