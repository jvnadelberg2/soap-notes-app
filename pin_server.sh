cd /Users/jonnadelberg/projects/therapist-notes-ai
lsof -nP -iTCP:3002 -sTCP:LISTEN -t | xargs -r kill -9
mkdir -p public/js
/bin/cat > server/pinned_index.mjs <<'EOF'
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const publicDir = path.join(__dirname, '..', 'public');
app.use((req,res,next)=>{res.set('X-Marker','ONEPAGE-PIN');next();});
app.use('/js', express.static(path.join(publicDir,'js'), { fallthrough:false }));
app.get('*', (_req,res) => {
  const html = `<!doctype html>
<html lang="en" data-marker="ONEPAGE-PIN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>SOAP Notes (Local)</title>
    <link rel="stylesheet" href="/css/app.css">
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 16px; }
      .wrap { max-width: 920px; margin: 0 auto; }
      .row { display: flex; gap: 12px; align-items: center; margin: 8px 0; flex-wrap: wrap; }
      label { display: flex; gap: 6px; align-items: center; }
      textarea { width: 100%; height: 180px; }
      .out { background: #f7f7f9; padding: 10px; border: 1px solid #ddd; min-height: 100px; white-space: pre-wrap; }
      .warn { color: #b00020; margin-left: 10px; }
      #status { margin-left: 10px; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>SOAP Notes (Local)</h1>
      <div class="row">
        <label>Client <input id="client" placeholder="JS"></label>
        <label>Duration
          <select id="duration"><option>30</option><option selected>45</option><option>60</option></select>
        </label>
        <label>Template
          <select id="template"><option selected>SOAP</option><option>DAP</option><option>BIRP</option></select>
        </label>
      </div>
      <textarea id="note" placeholder="Paste or type raw session notes here"></textarea>
      <div class="row">
        <button id="generate">Generate</button>
        <span id="status"></span>
        <span id="warn" class="warn" hidden></span>
      </div>
      <h3>Summary</h3>
      <pre id="summary" class="out"></pre>
      <h3>Note</h3>
      <pre id="soap" class="out"></pre>
      <div class="row">
        <button id="copy-soap">Copy SOAP</button>
        <button id="copy-summary">Copy Summary</button>
        <button id="save-txt">Save TXT</button>
        <button id="save-pdf">Save PDF</button>
      </div>
    </div>
    <script src="/js/appv4.js" defer></script>
  </body>
</html>`;
  res.type('html').send(html);
});
const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`listening on http://127.0.0.1:${port}`));
EOF
/bin/cat > public/js/appv4.js <<'EOF'
(function () {
  const $ = (id) => document.getElementById(id);
  const setStatus = (m) => { const el = $('status'); if (el) el.textContent = m || ''; };
  const setWarn = (m) => { const el = $('warn'); if (!el) return; if (m) { el.hidden = false; el.textContent = m; } else { el.hidden = true; el.textContent=''; } };
  function toSOAP(raw, client, duration) {
    const text = (raw || '').trim();
    const s = text || '(no subjective content)';
    const o = 'Affect congruent; alert and oriented x3.';
    const a = 'Symptoms consistent with generalized anxiety; good insight; motivated for change.';
    const p = 'Continue weekly sessions; daily journaling before bed; breathing exercise during anxiety; follow-up next week.';
    return `S: ${s}\n\nO: ${o}\n\nA: ${a}\n\nP: ${p}\n\nClient: ${client||'N/A'} | Duration: ${duration||'N/A'} min`;
  }
  async function copyFrom(id){const el=$(id);if(!el)return;const t=el.textContent||'';if(!t){setStatus('Nothing to copy');return;}await navigator.clipboard.writeText(t);setStatus('Copied');}
  function saveTxt(){const summary=$('summary')?.textContent?.trim()||'';const soap=$('soap')?.textContent?.trim()||'';if(!summary&&!soap){setStatus('Nothing to save');return;}const client=$('client')?.value?.trim()||'client';const ts=new Date().toISOString().replace(/[:.]/g,'-');const out=`Summary\n\n${summary}\n\n---\n\nNote\n\n${soap}\n`;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out],{type:'text/plain;charset=utf-8'}));a.download=`${client}-${ts}.txt`;document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove();setStatus('Saved .txt');}
  function bind(){
    $('generate')?.addEventListener('click',()=>{const note=$('note')?.value?.trim()||'';if(!note){setWarn('Enter notes first');setStatus('');return;}setWarn('');const client=$('client')?.value?.trim()||'';const duration=$('duration')?.value||'';const summary=note.split(/\n+/).slice(0,2).join(' ').trim();const soap=toSOAP(note,client,duration);if($('summary'))$('summary').textContent=summary||'(empty summary)';if($('soap'))$('soap').textContent=soap||'(empty note)';setStatus('Done');});
    $('copy-soap')?.addEventListener('click',()=>copyFrom('soap'));
    $('copy-summary')?.addEventListener('click',()=>copyFrom('summary'));
    $('save-txt')?.addEventListener('click',saveTxt);
    $('save-pdf')?.addEventListener('click',()=>window.print());
    setStatus('Ready');
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',bind,{once:true});}else{bind();}
})();
EOF
node server/pinned_index.mjs

