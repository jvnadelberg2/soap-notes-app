import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const publicDir = path.join(__dirname, '..', 'public');

app.use((req,res,next)=>{ res.set('X-Marker','ONEPAGE-PIN'); next(); });
app.use('/js', express.static(path.join(publicDir,'js'), { fallthrough:false }));
app.use('/css', express.static(path.join(publicDir,'css'), { fallthrough:false }));

app.get('/health', (req,res)=>{ res.json({ status: 'ok' }); });

app.get('*', (_req,res) => {
  const html = `<!doctype html>
<html lang="en" data-marker="ONEPAGE-PIN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>SOAP Notes</title>
    <link rel="stylesheet" href="/css/app.css">
  </head>
  <body>
    <h1>SOAP Notes</h1>
    <div id="app"></div>
    <script src="/js/appv4.js" defer></script>
  </body>
</html>`;
  res.type('html').send(html);
});

const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`SOAP Notes app ready at http://127.0.0.1:${port}`));
