// scripts/patch-and-run.mjs  (ESM, because your package.json uses "type":"module")
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const root       = path.resolve(__dirname, '..');

const files = [
  path.join(root, 'public', 'app.js'),
  path.join(root, 'public', 'generate-stable.js'),
  path.join(root, 'public', 'actions-stable.js'),
];

function exists(p){ try { fsSync.statSync(p); return true; } catch { return false; } }
function backup(p){ fsSync.copyFileSync(p, p + '.bak.' + Date.now()); }

const helperSnippet = `/* === injected: complaint + patientHistory -> Subjective === */
(function(){
  if (window.enrichFromUI) return;
  window.enrichFromUI = function(p){
    try{
      var d=document;
      function get(id){ var el=d.getElementById(id); return el?String(('value' in el?el.value:el.textContent)||'').trim():'' }
      function first(ids){ for(var i=0;i<ids.length;i++){ var v=get(ids[i]); if(v) return v } return '' }
      function ensureStr(v){ return (typeof v==='string')?v:(v?String(v):'') }
      function setIfEmpty(o,k,val){ if(val&&(o[k]==null||o[k]==='')) o[k]=val }
      function hasLabel(subj,label){
        var re=new RegExp('(^|\\\\n)\\\\s*'+label.replace(/[.*+?^${}()|[\\\\]\\\\\\\\]/g,'\\\\\\\\$&')+'\\\\s*:','i');
        return re.test(subj);
      }

      var complaint = first(['complaint','chiefComplaint','cc']);
      var history   = first(['patientHistory','hpi','history']);

      var subj = ensureStr(p.Subjective);
      if(complaint && !hasLabel(subj,'Chief Complaint')) subj += (subj?'\\n':'') + 'Chief Complaint: ' + complaint;
      if(history   && !hasLabel(subj,'History of Present Illness')) subj += (subj?'\\n':'') + 'History of Present Illness: ' + history;
      if(subj) p.Subjective = subj;

      setIfEmpty(p,'complaint',complaint);
      setIfEmpty(p,'hpi',history);

      return p;
    }catch(_){ return p; }
  };
})();\n`;

const payloadRe = /JSON\.stringify\s*\(\s*payload\s*\)/g;
const enriched  = 'JSON.stringify(window.enrichFromUI ? window.enrichFromUI(payload) : payload)';

function patchAppSource(src){
  let changed = false;
  if (!/window\.enrichFromUI/.test(src)) { src = helperSnippet + src; changed = true; }
  if (payloadRe.test(src) && !src.includes(enriched)) { src = src.replace(payloadRe, enriched); changed = true; }
  return { out: src, changed };
}
function patchGenericSource(src){
  let changed = false;
  if (payloadRe.test(src) && !src.includes(enriched)) { src = src.replace(payloadRe, enriched); changed = true; }
  return { out: src, changed };
}

async function patchFile(p, patcher){
  if (!exists(p)) { console.log('Missing:', p); return; }
  const src = await fs.readFile(p, 'utf8');
  const { out, changed } = patcher(src);
  if (changed) {
    backup(p);
    await fs.writeFile(p, out, 'utf8');
    console.log('Patched', p);
  } else {
    console.log('No changes needed for', p);
  }
}

async function patchAll(){
  for (const p of files){
    if (p.endsWith('/app.js')) await patchFile(p, patchAppSource);
    else                       await patchFile(p, patchGenericSource);
  }
}

function sh(cmd){
  return new Promise((resolve)=> {
    const child = spawn('bash', ['-lc', cmd], { stdio: 'inherit' });
    child.on('exit', ()=> resolve());
  });
}

async function runServer(){
  // Free ports 5050 and 5000 if something is already listening
  await sh('lsof -ti :5050 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true');
  await sh('lsof -ti :5000 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true');

  console.log('\nStarting server on http://localhost:5050 ...\n');
  const child = spawn('npm', ['run','start:5050'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '5050' }
  });
  child.on('exit', (code)=> process.exit(code ?? 0));
}

(async function main(){
  try{
    await patchAll();
    await runServer();
  }catch(err){
    console.error('patch-and-run error:', err);
    process.exit(1);
  }
})();
