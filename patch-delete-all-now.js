'use strict';
const fs = require('fs'), path = require('path');

function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,s){ fs.writeFileSync(p,s,'utf8'); console.log('[patched]', p); }
function safe(p,fn){ if(fs.existsSync(p)) fn(); }

const root = process.cwd();
const storeFile  = path.join(root,'services','store.js');
const routesFile = path.join(root,'routes','notes-api.js');
const appFile    = path.join(root,'public','app.js');
const htmlFile   = path.join(root,'public','index.html');

safe(storeFile, () => {
  let s = read(storeFile);
  if (!/function\s+purgeAll\s*\(/.test(s)) {
    const needsFsp = !/['"]fs\/promises['"]/.test(s);
    const needsPath = !/\bpath\b/.test(s);
    if (needsPath) s = `const path = require('path');\n` + s;
    if (needsFsp) s = `const fsp = require('fs/promises');\n` + s;
    s += `
const STORE_NOTES_DIR__PURGE = process.env.NOTES_DIR ? path.resolve(process.env.NOTES_DIR) : path.resolve(__dirname,'..','notes');
async function purgeAll(){
  const files = await fsp.readdir(STORE_NOTES_DIR__PURGE).catch(()=>[]);
  const deletedCount = files.filter(n=>!n.startsWith('.')).length;
  await fsp.rm(STORE_NOTES_DIR__PURGE,{recursive:true,force:true});
  await fsp.mkdir(STORE_NOTES_DIR__PURGE,{recursive:true});
  return { ok:true, deleted:deletedCount };
}
`;
  }
  if (/module\.exports\s*=/.test(s) && !/purgeAll\b/.test(s)) {
    s = s.replace(/module\.exports\s*=\s*\{([\s\S]*?)\};?/, (m,inner) => {
      inner = inner.trim();
      return `module.exports = { ${inner}${inner? ', ' : ''}purgeAll };`;
    });
  } else if (!/module\.exports\.purgeAll\b/.test(s)) {
    s += `\nmodule.exports = module.exports || {};\nmodule.exports.purgeAll = purgeAll;\n`;
  }
  write(storeFile,s);
});

safe(routesFile, () => {
  let s = read(routesFile);
  if (!/require\(\s*['"]\.\.\/services\/store['"]\s*\)/.test(s)) {
    s = s.replace(/(const\s+router\s*=\s*require\([^\)]+\)\(\)\s*;)/, `const store = require('../services/store');\n$1`);
  }
  if (!/router\.delete\(\s*['"`]\/notes['"`]\s*,/.test(s)) {
    s = s.replace(/(const\s+router\s*=\s*require\([^\)]+\)\(\)\s*;)/,
      `$1\n\nrouter.delete('/notes', async (req,res)=>{\n  const allow = (process.env.ALLOW_PURGE==='1' || process.env.ALLOW_PURGE==='true');\n  const wantsAll = String(req.query.all||'')==='1';\n  if(!allow || !wantsAll) return res.status(403).json({ ok:false, error:{ code:'PURGE_DISABLED' } });\n  try { const out = await store.purgeAll(); return res.status(200).json(out); }\n  catch(e){ return res.status(500).json({ ok:false, error:{ code:'PURGE_FAILED' } }); }\n});\n`);
  }
  write(routesFile,s);
});

safe(appFile, () => {
  let s = read(appFile);
  if (!/function\s+wireDeleteAll\s*\(/.test(s)) {
    s += `
function wireDeleteAll(){
  const btn = document.querySelector('#btn-delete-all, [data-action="delete-all"], #btn-clear-notes');
  if(!btn) return;
  btn.addEventListener('click', async (e)=>{
    e.preventDefault();
    const t = window.prompt('This will delete ALL notes (drafts + finalized). Type DELETE to continue.');
    if(t!=='DELETE') return;
    btn.disabled = true;
    try{
      const r = await fetch('/api/notes?all=1', { method:'DELETE' });
      const j = await r.json().catch(()=>({}));
      if(r.ok && j && typeof j.deleted !== 'undefined') alert('Deleted '+j.deleted+' notes.'); else alert('Delete failed.');
    }catch(e){ alert('Delete failed.'); }
    finally{ btn.disabled = false; if (typeof refreshList==='function') refreshList(); }
  }, { passive:false });
}
`;
  } else {
    s = s.replace(/querySelector\([^)]*\)/, 'querySelector(\'#btn-delete-all, [data-action="delete-all"], #btn-clear-notes\')');
  }
  if (/function\s+wire\s*\(\)\s*\{/.test(s) && !/wireDeleteAll\s*\(\)\s*;/.test(s)) {
    s = s.replace(/function\s+wire\s*\(\)\s*\{\s*/, m => m + '  try{ wireDeleteAll(); }catch(e){}\n');
  }
  write(appFile,s);
});

safe(htmlFile, () => {
  let s = read(htmlFile);
  if (/id="btn-clear-notes"/.test(s) && !/data-action="delete-all"/.test(s)) {
    s = s.replace(/<button([^>]*id="btn-clear-notes"[^>]*)>/, (m,g1) => `<button${g1} data-action="delete-all">`);
    write(htmlFile,s);
  }
});
