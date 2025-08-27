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
