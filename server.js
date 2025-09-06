// server.js  (CommonJS; Node 18+)
// Start with: PORT=5050 node server.js
// Optional env:
//   MODEL_API_URL=http://localhost:11434/v1/chat/completions
//   MODEL_NAME='llama3.1:8b'
//   PUBLIC_DIR=/absolute/path/to/public

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5050;

function resolvePublicDir() {
  const candidates = [
    process.env.PUBLIC_DIR && path.resolve(process.env.PUBLIC_DIR),
    path.resolve(__dirname, 'public'),
    path.resolve(process.cwd(), 'public'),
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return candidates[0] || path.resolve(__dirname, 'public');
}
const PUBLIC_DIR = resolvePublicDir();
const INDEX_PATH = path.join(PUBLIC_DIR, 'index.html');

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR, { index: false }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    publicDir: PUBLIC_DIR,
    indexExists: fs.existsSync(INDEX_PATH),
    modelApi: process.env.MODEL_API_URL || 'http://localhost:11434/v1/chat/completions',
    modelName: process.env.MODEL_NAME || 'llama3.1:8b',
  });
});

app.get('/api/models', (_req, res) => {
  const id = process.env.MODEL_NAME || 'llama3.1:8b';
  res.json({ models: [{ id, label: id }] });
});

/* ---------- Helpers ---------- */

function buildPromptFromBody(body = {}) {
  const {
    patient = '', mrn = '', dob = '', sex = '', age = '',
    chiefComplaint = '', hpi = '', pmh = '', fh = '', sh = '',
    ros = '', diagnostics = '', exam = ''
  } = body;

  return [
    'You are a precise clinical assistant.',
    'Return ONLY a JSON object with EXACT keys: {"subjective":"","objective":"","assessment":"","plan":""}.',
    'Each value MUST be a non-empty string. If no information exists for a section, set it to "None provided.".',
    'Do NOT invent vitals, diagnostics, or exam details. The server will set the objective section from inputs.',
    'Reflect important ROS/HPI findings (e.g., yellow eyes) in Assessment and Plan when clinically appropriate.',
    'Avoid placeholders like "[insert timeframe]"; use practical phrasing (e.g., "in 1–2 weeks").',
    '',
    'Patient Context:',
    `Patient: ${patient} | MRN: ${mrn} | DOB: ${dob} | Sex: ${sex} | Age: ${age}`,
    `Chief Complaint: ${chiefComplaint}`,
    `HPI: ${hpi}`,
    `PMH: ${pmh}`,
    `FH: ${fh}`,
    `SH: ${sh}`,
    `ROS: ${ros}`,
    `Diagnostics (user-entered): ${diagnostics}`,
    `Exam (user-entered): ${exam}`,
  ].join('\n');
}

function coerceSoapJson(content) {
  const fallback = {
    subjective: 'None provided.',
    objective: 'None provided.',
    assessment: 'None provided.',
    plan: 'None provided.',
  };
  if (!content || typeof content !== 'string') return fallback;

  const tryParse = (txt) => {
    try {
      const j = JSON.parse(txt);
      return {
        subjective: (j.subjective || '').toString().trim() || fallback.subjective,
        objective: (j.objective || '').toString().trim() || fallback.objective,
        assessment: (j.assessment || '').toString().trim() || fallback.assessment,
        plan: (j.plan || '').toString().trim() || fallback.plan,
      };
    } catch { return null; }
  };

  const strict = tryParse(content);
  if (strict) return strict;

  const first = content.indexOf('{');
  const last = content.lastIndexOf('}');
  if (first !== -1 && last > first) {
    const inner = tryParse(content.slice(first, last + 1));
    if (inner) return inner;
  }
  return { ...fallback, subjective: content.trim() || fallback.subjective };
}

function buildObjectiveFromBody(body = {}) {
  const { vBP = '', vHR = '', vRR = '', vTemp = '', vWeight = '', vO2Sat = '', diagnostics = '', exam = '' } = body;

  const vitals = [];
  if (vBP) vitals.push(`BP ${vBP}`);
  if (vHR) vitals.push(`HR ${vHR}`);
  if (vRR) vitals.push(`RR ${vRR}`);
  if (vTemp) vitals.push(`Temp ${vTemp}`);
  if (vWeight) vitals.push(`Weight ${vWeight}`);
  if (vO2Sat) vitals.push(`O2 Sat ${vO2Sat}`);

  const sections = [];
  if (vitals.length) sections.push(`Vitals: ${vitals.join(', ')}`);
  if (diagnostics) sections.push(`Diagnostics: ${diagnostics}`);
  if (exam) sections.push(`Exam: ${exam}`);

  // 🔒 If absolutely nothing, return the exact wording you want:
  return sections.length ? sections.join('\n') : 'No data provided.';
}

function genericAssessmentAndPlan(body = {}) {
  const { chiefComplaint = '', ros = '' } = body;
  const lcCC = (chiefComplaint || '').toLowerCase();
  const lcROS = (ros || '').toLowerCase();

  if (lcCC.includes('nosebleed') || lcCC.includes('epistaxis')) {
    return {
      assessment: 'Epistaxis, likely anterior, based on limited details provided.',
      plan: [
        '1) Firm continuous pressure to soft nose for 10–15 min; lean forward.',
        '2) Humidification/saline; avoid nose blowing/picking for 24–48 h.',
        '3) Consider topical vasoconstrictor if appropriate; review anticoagulants.',
        '4) Red flags: heavy/persistent bleeding, instability, frequent recurrence → consider ENT.',
        '5) Arrange follow-up as appropriate.'
      ].join('\n')
    };
  }

  if (lcROS.includes('eyes: yellow') || (lcROS.includes('sclera') && lcROS.includes('yellow'))) {
    return {
      assessment: 'Scleral icterus (yellow eyes) noted; etiology not determined with current info.',
      plan: [
        '1) Correlate with history/exam; consider bilirubin & LFTs if appropriate.',
        '2) Screen for associated symptoms (dark urine, abdominal pain, pruritus).',
        '3) Return precautions for worsening jaundice/systemic symptoms.',
        '4) Arrange timely follow-up and further workup as indicated.'
      ].join('\n')
    };
  }

  return {
    assessment: 'Limited data; condition not fully characterized.',
    plan: [
      '1) Supportive care as appropriate.',
      '2) Monitor symptoms; return precautions for worsening.',
      '3) Follow-up for reassessment and additional workup as indicated.'
    ].join('\n')
  };
}

function fillIfEmpty(result, body) {
  const out = { ...result };
  const empty = (s) => !s || s === 'None provided.' || !String(s).trim();
  if (empty(out.assessment) || empty(out.plan)) {
    const gp = genericAssessmentAndPlan(body);
    if (empty(out.assessment)) out.assessment = gp.assessment;
    if (empty(out.plan)) out.plan = gp.plan;
  }
  return out;
}

/* ---------- Model call ---------- */

async function invokeModel(body) {
  const api = process.env.MODEL_API_URL || 'http://localhost:11434/v1/chat/completions';
  const model = process.env.MODEL_NAME || 'llama3.1:8b';

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'Return ONLY valid JSON with keys {"subjective":"","objective":"","assessment":"","plan":""}. No placeholders; no fabricated vitals/exam/diagnostics. The server will overwrite "objective" from user inputs.'
      },
      { role: 'user', content: buildPromptFromBody(body) },
    ],
    temperature: 0.1,
    stream: false,
    response_format: { type: 'json_object' },
  };

  const r = await fetch(api, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data;
  try { data = await r.json(); }
  catch (e) { return { ok: false, error: 'Bad JSON from model API', raw: await r.text() }; }

  const content = data?.choices?.[0]?.message?.content ?? data?.message?.content ?? '';
  const parsed = coerceSoapJson(content);

  // 🔒 Hard guard: server builds Objective from raw inputs only.
  const objective = buildObjectiveFromBody(body);
  const repaired = fillIfEmpty({ ...parsed, objective }, body);

  return { ok: true, result: repaired, raw: content };
}

async function handleGenerate(req, res) {
  try {
    const { ok, result, error } = await invokeModel(req.body || {});
    if (!ok) return res.status(502).json({ ok: false, error });
    res.json({ ok: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}

/* ---------- Routes ---------- */

app.post('/api/generate-soap-json-annotated', handleGenerate);
app.post('/api/soap', handleGenerate);
app.post('/api/generate_soap', handleGenerate);
app.post('/api/generate', handleGenerate);

app.get('/', (_req, res) => {
  if (!fs.existsSync(INDEX_PATH)) return res.status(500).send(`index.html not found at ${INDEX_PATH}`);
  res.sendFile(INDEX_PATH);
});
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (fs.existsSync(INDEX_PATH)) return res.sendFile(INDEX_PATH);
  res.status(404).send('index.html not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('[STATIC ROOT]', PUBLIC_DIR);
});
