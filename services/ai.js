'use strict';
// services/ai.js — Ollama JSON adapter (with debug logging)

console.log("[ai] services/ai.js loaded — exports at load:", Object.keys(module.exports || {}));

let _fetch = globalThis.fetch;
if (!_fetch) {
  try { _fetch = require('undici').fetch; }
  catch { throw new Error('[ai] Need Node 18+ (fetch) or `npm i undici`.'); }
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
console.log('[ai] services/ai.js (Ollama JSON) loaded; OLLAMA_URL=', OLLAMA_URL);

/* ---------- Prompt Builder ---------- */
function buildJSONPrompt({
  subjective = '',
  objective = '',
  specialty = '',
  assistLevel = 1,
  noteType = 'SOAP',
  provider = ''
}) {
  const detail =
    assistLevel >= 3 ? 'Write an expanded, clinically useful Assessment and Plan with rationale and specific next steps.' :
    assistLevel === 2 ? 'Write a concise, specific Assessment and Plan (diagnostics, therapeutics, safety, follow-up).' :
                        'Write a brief Assessment and Plan (concise, concrete).';

  return [
    `You are a clinician drafting a ${noteType} note.` + (specialty ? ` Specialty: ${specialty}.` : ''),
    provider ? `The clinician is ${provider}. Always refer to them by full name (“${provider}”), never as “Dr. [Last Name]”.` : '',
    'Return ONLY a JSON object with these exact keys:',
    '{"subjective": string, "objective": string, "assessment": string, "plan": string}',
    'Rules:',
    '- Return ONLY the JSON object. No preamble. No code fences.',
    '- Do NOT fabricate demographics or exam findings.',
    '- Use professional medical prose.',
    '- Never refer to yourself (the AI, assistant, or scribe).',
    '- Never insert placeholders like [Last Name].',
    '- If inputs are sparse, STILL write a conservative, clinically safe assessment and plan (do not leave empty).',
    '',
    'Provided subjective:',
    subjective || '(none)',
    '',
    'Provided objective:',
    objective || '(none)',
    '',
    detail
  ].filter(Boolean).join('\n');
}

/* ---------- JSON Helpers ---------- */
function tryParseJSON(text = '') {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = fenced ? fenced[1] : text;
  try { return JSON.parse(raw); } catch { return null; }
}

function splitFlatSOAP(text = '') {
  const out = { subjective: '', objective: '', assessment: '', plan: '' };
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let cur = null;
  const header = (s) => {
    s = String(s || '').trim().toLowerCase().replace(/:$/, '');
    if (s === 'subjective') return 'subjective';
    if (s === 'objective') return 'objective';
    if (s === 'assessment') return 'assessment';
    if (s === 'assessment and plan') return 'assessment_and_plan';
    if (s === 'plan') return 'plan';
    return null;
  };
  for (const ln of lines) {
    const maybe = header(ln);
    if (maybe) { cur = maybe; continue; }
    if (!cur) continue;
    if (cur === 'assessment_and_plan') {
      out.assessment += (out.assessment ? '\n' : '') + ln;
      out.plan       += (out.plan ? '\n' : '') + ln;
    } else {
      out[cur] += (out[cur] ? '\n' : '') + ln;
    }
  }
  return out;
}

function sanitize(s = '') {
  return String(s || '')
    .replace(/\[object Object\]/g, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---------- Ollama Caller ---------- */
async function callOllama({ model, prompt }) {
  const m = model || 'llama3';
  console.log('[ai.callOllama] model=', m);
  console.log('[ai.callOllama] prompt >>>\n' + prompt + '\n<<< END PROMPT');
  const res = await _fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: m,
      prompt,
      stream: false,
      options: { temperature: 0.2, num_ctx: 4096 }
    })
  });
  console.log('[ai.callOllama] status', res.status);
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  const text = (data && (data.response || data.text)) || '';
  console.log('[ai.callOllama] RAW <<<', (text || '').slice(0, 600), '>>>');
  return String(text || '').trim();
}

/* ---------- Main API ---------- */
async function generate({
  body = {},
  subjective = '',
  objective = '',
  specialty = '',
  assistLevel = 1,
  model = '',
  noteType = 'SOAP'
} = {}) {
  console.log("[ai.generate] called with subjective length:", subjective.length,
              "objective length:", objective.length,
              "assistLevel:", assistLevel,
              "model:", model,
              "noteType:", noteType);

const prompt = buildJSONPrompt({ subjective, objective, specialty, assistLevel, noteType, provider: body.provider || '' });  const raw = await callOllama({ model, prompt });

  let j = tryParseJSON(raw);
  if (!j) {
    const s = splitFlatSOAP(raw);
    j = { subjective: s.subjective, objective: s.objective, assessment: s.assessment, plan: s.plan };
  }

  const sections = {
    subjective: sanitize(j.subjective || ''),
    objective:  sanitize(j.objective  || ''),
    assessment: sanitize(j.assessment || ''),
    plan:       sanitize(j.plan       || '')
  };

  const text = [
    'Subjective:', sections.subjective,
    '',
    'Objective:', sections.objective,
    '',
    'Assessment:', sections.assessment,
    '',
    'Plan:', sections.plan
  ].join('\n');

  console.log("[ai.generate] completed; lengths:", {
    S: sections.subjective.length,
    O: sections.objective.length,
    A: sections.assessment.length,
    P: sections.plan.length
  });

  return { text, sections };
}

/* ---------- Exports ---------- */
module.exports = { generate };
module.exports.generateSoapNote = module.exports.generate;
module.exports.generateSOAP     = module.exports.generate;
module.exports.generateSections = module.exports.generate;
module.exports.default = module.exports;