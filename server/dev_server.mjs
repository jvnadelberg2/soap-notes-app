// Minimal static+API server (no deps). Node 18+ required for global fetch.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Model API config (OpenAI-compatible, e.g., Ollama)
const MODEL_API_URL = process.env.MODEL_API_URL || 'http://localhost:11434/v1/chat/completions';
const DEFAULT_MODEL  = process.env.MODEL_NAME     || 'llama3.1:13b';

// Static root
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body ?? '');
  res.writeHead(status, { 'content-length': buf.length, ...headers });
  res.end(buf);
}

async function serveStatic(req, res) {
  let urlPath = new URL(req.url, 'http://x').pathname;
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = resolve(PUBLIC_DIR, '.' + urlPath);
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  try {
    const st = await stat(filePath);
    if (st.isDirectory()) return send(res, 404, 'Not Found');
    const ext = extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'content-length': st.size });
    createReadStream(filePath).pipe(res);
  } catch {
    send(res, 404, 'Not Found');
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return { __parse_error: true, raw };
  }
}

function buildMessages(payload) {
  // Strong instruction to return strict JSON, no code fences.
  const system = [
    'You are a clinical assistant generating SOAP notes.',
    'Return ONLY valid JSON (no code fences) with keys: subjective, objective, assessment, plan.',
    'Reproduce the provided subjective/objective content verbatim where given.',
    'Generate Assessment and Plan based on the inputs. Keep them factual and concise.',
  ].join(' ');

  const user = JSON.stringify({
    instruction: 'Produce structured SOAP JSON. Keep keys and nesting as shown.',
    expected_schema: {
      subjective: { chief_complaint: 'string', hpi: 'string', pmh: 'string', fh: 'string', sh: 'string' },
      objective:  { ros: 'string', vitals: { bp:'string', hr:'string', rr:'string', temp:'string', weight:'string', o2_sat:'string' }, diagnostics:'string', exam:'string' },
      assessment: 'string',
      plan: 'string'
    },
    data: payload
  });

  return [
    { role: 'system', content: system },
    { role: 'user',   content: user }
  ];
}

async function callModel(payload) {
  const modelName = payload?.meta?.model || DEFAULT_MODEL;
  const body = {
    model: modelName,
    messages: buildMessages(payload),
    temperature: 0.2,
    stream: false
  };

  const res = await fetch(MODEL_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Upstream ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? '';
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Model returned empty content.');
  }

  // Attempt to parse JSON; strip any stray fences or text around it.
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = content.slice(start, end + 1);
      parsed = JSON.parse(slice);
    } else {
      throw new Error('Model content was not valid JSON.');
    }
  }

  // Merge back meta if absent; ensure shape for client.
  const merged = {
    meta: payload.meta || {},
    subjective: parsed.subjective || payload.subjective || {},
    objective: parsed.objective || payload.objective || {},
    assessment: parsed.assessment ?? '',
    plan: parsed.plan ?? ''
  };

  return merged;
}

const server = createServer(async (req, res) => {
  try {
    const { method, url } = req;
    const path = new URL(url, 'http://x').pathname;

    if (method === 'POST' && path === '/api/generate-soap-json-annotated') {
      if (req.headers['content-type']?.includes('application/json') !== true) {
        return send(res, 415, JSON.stringify({ error: 'content-type must be application/json' }), { 'content-type': 'application/json' });
      }
      const payload = await readJson(req);
      if (payload.__parse_error) {
        return send(res, 400, JSON.stringify({ error: 'invalid JSON' }), { 'content-type': 'application/json' });
      }
      try {
        const data = await callModel(payload);
        return send(res, 200, JSON.stringify(data), { 'content-type': 'application/json' });
      } catch (e) {
        const msg = e && e.message ? String(e.message) : 'model error';
        return send(res, 502, JSON.stringify({ error: msg }), { 'content-type': 'application/json' });
      }
    }

    if (method === 'GET') return await serveStatic(req, res);
    return send(res, 405, 'Method Not Allowed');
  } catch (e) {
    const msg = e && e.message ? String(e.message) : 'server error';
    return send(res, 500, JSON.stringify({ error: msg }), { 'content-type': 'application/json' });
  }
});

server.listen(PORT, () => {
  console.log(`Dev server on http://localhost:${PORT}  (static: /public, API: /api/*)`);
  console.log(`MODEL_API_URL: ${MODEL_API_URL}`);
  console.log(`DEFAULT_MODEL: ${DEFAULT_MODEL}`);
});

