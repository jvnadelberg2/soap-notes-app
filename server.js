'use strict';

// server.js  (CommonJS)
const path = require('path');
const fs = require('fs');
const express = require('express');
const store = require('./services/store');
const { renderNotePDF } = require('./services/pdf');

const app = express();
const PORT = process.env.PORT || 5050;

const MODEL_API_URL = process.env.MODEL_API_URL || 'http://localhost:11434/v1/chat/completions';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.1:8b';

app.use(express.json({ limit: '1mb' }));

const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

app.get('/health', (req, res) => {
  const indexExists = fs.existsSync(path.join(publicDir, 'index.html'));
  res.json({ ok: true, publicDir, indexExists, modelApi: MODEL_API_URL, modelName: MODEL_NAME });
});

app.get('/api/models', async (req, res) => {
  try {
    const r = await fetch('http://localhost:11434/api/tags');
    if (r.ok) {
      const data = await r.json();
      const names = (data.models || []).map(m => m.name).filter(Boolean);
      if (names.length) return res.json(names);
    }
  } catch {}
  res.json([MODEL_NAME, 'llama3.2:3b', 'llama3:70b', 'mistral:7b', 'qwen2:7b', 'phi3:mini']);
});

async function callModel({ system, user, temperature = 0.2 }) {
  const body = { model: MODEL_NAME, temperature, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
  const resp = await fetch(MODEL_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) {
    const t = await resp.text().catch(()=>'');
    throw new Error(`Model API error ${resp.status}: ${t || resp.statusText}`);
  }
  const j = await resp.json();
  const text = j?.choices?.[0]?.message?.content ?? '';
  return (text || '').trim();
}

function s(x){ return (x ?? '').toString().trim(); }
function normalizeNone(txt){
  const t = (txt || '').trim();
  if (!t) return 'None provided.';
  if (/^none provided\b/i.test(t)) return 'None provided.';
  if (/^none\b/i.test(t)) return 'None provided.';
  if (/due to lack of information/i.test(t)) return 'None provided.';
  return t;
}

// SOAP helpers
function computeSubjective(body){
  const cc  = s(body.chiefComplaint);
  const hpi = s(body.hpi);
  const pmh = s(body.pmh);
  const fh  = s(body.fh);
  const sh  = s(body.sh);
  const ros = s(body.ros);

  const parts = [];
  if (cc)  parts.push(`Chief Complaint: ${cc}`);
  if (hpi) parts.push(`HPI: ${hpi}`);
  if (pmh) parts.push(`PMH: ${pmh}`);
  if (fh)  parts.push(`FH: ${fh}`);
  if (sh)  parts.push(`SH: ${sh}`);
  if (ros) parts.push(`ROS: ${ros}`);

  return parts.length ? parts.join('\n') : 'None provided.';
}

function computeObjective(body){
  const vBP = s(body.vBP);
  const vHR = s(body.vHR);
  const vRR = s(body.vRR);
  const vTemp = s(body.vTemp);
  const vWeight = s(body.vWeight);
  const vO2Sat = s(body.vO2Sat);
  const height = s(body.height);
  const pain = s(body.painScore);
  const diag = s(body.diagnostics);
  const exam = s(body.exam);
  const allergies = s(body.allergies);
  const meds = s(body.medications);

  const parts = [];
  const haveVitals = vBP || vHR || vRR || vTemp || vWeight || vO2Sat || height || pain;
  if (haveVitals) {
    const vitals = [
      `BP: ${vBP || '—'}`,
      `HR: ${vHR || '—'}`,
      `RR: ${vRR || '—'}`,
      `Temp: ${vTemp || '—'}`,
      `Weight: ${vWeight || '—'}`,
      `O2 Sat: ${vO2Sat || '—'}`
    ];
    if (height) vitals.push(`Height: ${height}`);
    if (pain) vitals.push(`Pain: ${pain}`);
    parts.push(vitals.join(', '));
  }
  if (allergies) parts.push(`Allergies: ${allergies}`);
  if (meds) parts.push(`Medications: ${meds}`);
  if (diag) parts.push(`Diagnostics: ${diag}`);
  if (exam) parts.push(`Exam: ${exam}`);

  return parts.length ? parts.join('\n') : 'None provided.';
}

function hasAnyClinicalInput(body){
  const subj = computeSubjective(body);
  const obj  = computeObjective(body);
  const anyS = subj && subj !== 'None provided.';
  const anyO = obj  && obj  !== 'None provided.';
  return anyS || anyO;
}

function parseSOAPSections(text){
  const T = (text || '').replace(/\r\n/g, '\n');
  const heads = ['Subjective','Objective','Assessment','Plan'];
  const out = {};
  for (const name of heads) {
    const pattern = new RegExp(
      String.raw`(?:^|\n)\s*(?:\*\*)?\s*${name}\s*(?:\*\*)?\s*:?\s*\n?` +
      String.raw`([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*)?\s*(?:Subjective|Objective|Assessment|Plan)\s*(?:\*\*)?\s*:?\s*\n?|$)`,
      'i'
    );
    const m = T.match(pattern);
    if (m) out[name.toLowerCase()] = m[1].trim();
  }
  return out;
}

function shapeSOAP({ subj, obj, assess, plan }){
  return `Subjective
${normalizeNone(subj)}

Objective
${normalizeNone(obj)}

Assessment
${normalizeNone(assess)}

Plan
${normalizeNone(plan)}`;
}

async function handleSoap(req, res){
  try{
    const useInference = !!req.body?.useInference;
    const subj = computeSubjective(req.body || {});
    const obj  = computeObjective(req.body || {});
    const anyInput = hasAnyClinicalInput(req.body || {});

    if (!useInference) {
      const finalText = shapeSOAP({ subj, obj, assess: 'None provided.', plan: 'None provided.' });
      return res.json({ ok:true, text: finalText, noteText: finalText, note: finalText });
    }

    let assess = 'None provided.';
    let plan   = 'None provided.';
    if (anyInput) {
      const system =
        'You are a clinical documentation assistant. Based ONLY on the provided Subjective and Objective text, ' +
        "write Assessment and Plan. Do not invent data. If insufficient information, return 'None provided.' " +
        'Return plain text with the two headings: Assessment, Plan. No markdown.';
      const user =
`Subjective:
${subj}

Objective:
${obj}

Write Assessment and Plan only.`;
      const modelText = await callModel({ system, user, temperature: 0.1 });
      const parsed = parseSOAPSections(modelText || '');
      assess = parsed.assessment || modelText || '';
      plan   = parsed.plan || '';

      if (!parsed.assessment && !parsed.plan) {
        const split = (modelText || '').split(/\n\s*Plan\s*:?\s*\n/i);
        if (split.length === 2) {
          assess = split[0].replace(/^\s*Assessment\s*:?\s*\n?/i,'').trim();
          plan   = split[1].trim();
        }
      }
      assess = normalizeNone(assess || '');
      plan   = normalizeNone(plan || '');
    }

    const finalText = shapeSOAP({ subj, obj, assess, plan });
    return res.json({ ok:true, text: finalText, noteText: finalText, note: finalText });
  } catch(e){
    res.status(500).json({ ok:false, error:'Error generating SOAP note.' });
  }
}

app.post('/api/generate-soap-json-annotated', handleSoap);
app.post('/api/generate_soap', handleSoap);
app.post('/api/soap', handleSoap);

// BIRP
function pick(body, keys){
  for (const k of keys) {
    const v = body?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}
function normalizeBIRP(body){
  const behavior = pick(body, ['birpBehavior','behavior','observation','birpObservation','birp_behavior']);
  const intervention = pick(body, ['birpIntervention','intervention','birp_intervention']);
  const response = pick(body, ['birpResponse','response','birp_response']);
  const plan = pick(body, ['birpPlan','plan','birp_plan','treatmentPlan','birpPlanText']);
  return { behavior, intervention, response, plan };
}
function parseBIRPSections(text){
  const T = (text || '').replace(/\r\n/g, '\n');
  const names = ['Behavior','Intervention','Response','Plan'];
  const out = {};
  for (const name of names) {
    const pattern = new RegExp(
      String.raw`(?:^|\n)\s*(?:\*\*)?\s*${name}\s*(?:\*\*)?\s*:?\s*\n?` +
      String.raw`([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*)?\s*(?:Behavior|Intervention|Response|Plan)\s*(?:\*\*)?\s*:?\s*\n?|$)`,
      'i'
    );
    const m = T.match(pattern);
    if (m) out[name.toLowerCase()] = m[1].trim();
  }
  return out;
}
function shapedBIRPText(x){
  return `Behavior
${normalizeNone(x.behavior)}

Intervention
${normalizeNone(x.intervention)}

Response
${normalizeNone(x.response)}

Plan
${normalizeNone(x.plan)}`;
}
async function handleBIRP(req, res){
  try{
    const useInference = !!req.body?.useInference;
    const fields = normalizeBIRP(req.body || {});
    const userShaped = shapedBIRPText(fields);
    if (!useInference) {
      return res.json({ ok:true, text:userShaped, noteText:userShaped, note:userShaped, ...fields });
    }

    const system =
      'You are a clinical documentation assistant. Produce a BIRP note with the sections Behavior, Intervention, Response, Plan. ' +
      "Use ONLY details provided; if a section is missing, output 'None provided.' Return plain text with those four headings. " +
      'Do not include markdown, bold text, or a title.';

    const user =
`Behavior: ${fields.behavior || 'None provided.'}
Intervention: ${fields.intervention || 'None provided.'}
Response: ${fields.response || 'None provided.'}
Plan: ${fields.plan || 'None provided.'}

Output as plain text with exactly the four headings above. No extra text.`;

    let modelText = await callModel({ system, user, temperature: 0.1 });
    const parsed = parseBIRPSections(modelText || '');

    const merged = {
      behavior: fields.behavior || parsed.behavior || '',
      intervention: fields.intervention || parsed.intervention || '',
      response: fields.response || parsed.response || '',
      plan: fields.plan || parsed.plan || ''
    };

    const finalText = shapedBIRPText(merged);
    return res.json({ ok:true, text:finalText, noteText:finalText, note:finalText, ...merged });
  } catch(e){
    res.status(500).json({ ok:false, error:'Error generating BIRP note.' });
  }
}
['/api/generate-birp-json-annotated','/api/generate-birp','/api/birp'].forEach(p => app.post(p, handleBIRP));

// Notes CRUD
app.post('/api/notes', async (req, res) => {
  try{
    const saved = await store.saveNote(req.body || {});
    res.status(201).json({ ok:true, id:saved.id, note:saved });
  } catch(e){
    res.status(500).json({ ok:false, error:{ code:'SAVE_ERROR', message:'Failed to save note' } });
  }
});
app.put('/api/notes/:id', async (req, res) => {
  try{
    const updated = await store.updateNote(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ ok:false, error:{ code:'NOT_FOUND', message:'Note not found' } });
    res.json({ ok:true, note:updated });
  } catch(e){
    res.status(500).json({ ok:false, error:{ code:'UPDATE_ERROR', message:'Failed to update note' } });
  }
});
app.get('/api/notes/:id', async (req, res) => {
  try{
    const n = await store.getNoteById(req.params.id);
    if (!n) return res.status(404).json({ ok:false, error:{ code:'NOT_FOUND', message:'Note not found' } });
    res.json({ ok:true, note:n });
  } catch(e){
    res.status(500).json({ ok:false, error:{ code:'LOAD_ERROR', message:'Failed to load note' } });
  }
});
app.get('/api/notes', async (req, res) => {
  try{
    const list = await store.listNotes();
    res.json({ ok:true, notes:list });
  } catch(e){
    res.status(500).json({ ok:false, error:{ code:'LIST_ERROR', message:'Failed to list notes' } });
  }
});

// PDF export
app.get('/notes/:id/pdf', async (req, res) => {
  try{
    const noteId = req.params.id;
    const note = await store.getNoteById(noteId);
    if (!note) return res.status(404).json({ error:{ code:'NOT_FOUND', message:'Note not found' } });
    const raw = (req.query.format || '').toString().trim().toLowerCase();
    const format = raw === 'birp' ? 'birp' : 'soap';
    const pdfBuffer = await renderNotePDF(note, { format });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="note-${noteId}-${format}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch(err){
    res.status(500).json({ error:{ code:'PDF_ERROR', message:'Failed to generate PDF' } });
  }
});

app.get('/', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send('index.html not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
