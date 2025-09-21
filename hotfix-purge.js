'use strict';
const fs=require('fs'),path=require('path');
function patch(file,marker,append){
  const p=path.join(process.cwd(),file);
  const s=fs.readFileSync(p,'utf8');
  if(s.includes(marker)) return;
  fs.writeFileSync(p, s + '\n' + append, 'utf8');
  console.log('[patched]', file);
}

// 1) Backend route: DELETE /api/notes?all=1  (guarded by ALLOW_PURGE=1)
patch('routes/notes-api.js','PURGE_DISABLED',`
router.delete('/notes', async (req, res) => {
  const allow = (process.env.ALLOW_PURGE === '1' || process.env.ALLOW_PURGE === 'true');
  const wantsAll = String(req.query.all || '') === '1';
  if (!allow || !wantsAll) return res.status(403).json({ ok:false, error:{ code:'PURGE_DISABLED' } });
  try {
    const path = require('path');
    const fsp = require('fs/promises');
    const notesDir = path.resolve(__dirname, '..', 'notes');
    const files = await fsp.readdir(notesDir).catch(() => []);
    const deleted = files.filter(n => !n.startsWith('.')).length;
    await fsp.rm(notesDir, { recursive: true, force: true });
    await fsp.mkdir(notesDir, { recursive: true });
    return res.status(200).json({ ok:true, deleted });
  } catch {
    return res.status(500).json({ ok:false, error:{ code:'PURGE_FAILED' } });
  }
});`);

// 2) UI wire for your existing button id="btn-clear-notes"
patch('public/app.js','function wireDeleteAll',`
function wireDeleteAll(){
  var btn=document.getElementById('btn-clear-notes');
  if(!btn) return;
  btn.addEventListener('click', async function(e){
    e.preventDefault();
    var t=window.prompt('This will delete ALL notes. Type DELETE to continue.');
    if(t!=='DELETE') return;
    btn.disabled=true;
    try{
      var r=await fetch('/api/notes?all=1',{method:'DELETE'});
      var j={}; try{ j=await r.json(); }catch(_){}
      if(r.ok && j && typeof j.deleted!=='undefined'){ alert('Deleted '+j.deleted+' notes.'); }
      else { alert('Delete failed.'); }
    }catch(_){ alert('Delete failed.'); }
    finally{ btn.disabled=false; if(typeof refreshList==='function') refreshList(); }
  }, { passive:false });
}
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', wireDeleteAll); } else { wireDeleteAll(); }`);
