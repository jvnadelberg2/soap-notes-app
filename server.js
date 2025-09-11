/* BEGIN:ARCH-COMMENT
File: server.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: GET /health, GET /admin/metrics, GET /api/models, GET /specialties.js, GET /api/specialties, POST /api/generate-soap-json-annotated, POST /api/generate_soap, POST /api/soap, POST /api/birp
Exports: none detected
Notes: Consistent JSON error responses. Persists via services/store. Generates PDFs via services/pdf.
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const { checkSigningKeys } = require('./services/key-health');
const { metricsMiddleware, metricsHandler } = require('./observability/metrics');
const store = require('./services/store');
const { renderNotePDF } = require('./services/pdf');
const notesApi = require('./routes/notes-api');
const exportPdf = require('./routes/export-pdf');
const net = require('net');
const app = express();
const SK = checkSigningKeys();
if (process.env.REQUIRE_SIGNING_KEYS === '1' && !SK.ok) {
  console.error('[startup] signing keys missing:', SK.reasons.join('; '));
  process.exit(1);
} else if (!SK.ok) {
  console.warn('[startup] signing keys not fully configured:', SK.reasons.join('; '));
}
app.use(metricsMiddleware());
const PORT = Number(process.env.PORT) || 5050;

const MODEL_API_URL = (process.env.MODEL_API_URL || 'http://localhost:11434/v1/chat/completions').trim();
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.1:8b';

app.use(express.json({ limit: '1mb' }));

const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// mounts (routers)
app.use('/api', notesApi);
app.use('/', exportPdf);

app.get('/health', (_req, res) => {
  const indexExists = fs.existsSync(path.join(publicDir, 'index.html'));
app.get('/admin/metrics', metricsHandler);
  res.json({ ok: true, publicDir, indexExists, modelApi: MODEL_API_URL, modelName: MODEL_NAME });
});

app.get('/api/models', async (_req, res) => {
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

/* ---------- SPECIALTY DROPDOWN: server-side guarantee ---------- */

// we will serve /specialties.js even if the file is missing
const FALLBACK_SPECIALTIES_JS = `"use strict";(function(){var SPECIALTIES=[
"Addiction Counselor","Addiction Medicine Physician","Advanced Practice Registered Nurse (APRN)","Allergy / Immunology Physician","Anesthesiologist","Audiologist","Cardiologist","Cardiothoracic Surgeon","Case Manager","Child & Adolescent Psychiatrist","Clinical Laboratory Scientist","Clinical Mental Health Counselor","Clinical Nurse Specialist","Clinical Psychologist","Clinical Social Worker","Coding and Billing Specialist","Colorectal Surgeon","Critical Care Physician / Intensivist","Cytopathologist","Dermatologist","Developmental-Behavioral Pediatrician","Dietitian","Emergency Medical Technician (EMT)","Emergency Medicine Physician","Endocrinologist","Family Medicine Physician","Forensic Pathologist","Gastroenterologist","General Surgeon","Geneticist (Medical)","Geriatrician","Gynecologic Oncologist","Hand Surgeon","Health Information Manager","Hematologist","Hematologist-Oncologist","Hospice & Palliative Medicine Specialist","Hospitalist","Infectious Disease Specialist","Internal Medicine Physician","Interventional Radiologist","Laboratory Technologist","Legal / Compliance Officer","Licensed Marriage and Family Therapist (LMFT)","Licensed Professional Clinical Counselor (LPCC)","Licensed Practical Nurse (LPN)","Licensed Vocational Nurse (LVN)","Maternal-Fetal Medicine Specialist","Medical Assistant","Medical Geneticist","Medical Oncologist","Medical Scribe","Neonatologist","Nephrologist","Neurologist","Neuropathologist","Neurosurgeon","Nuclear Medicine Physician","Nurse Anesthetist (CRNA)","Nurse Midwife (CNM)","Nurse Practitioner (NP)","Obstetrician / Gynecologist (OB/GYN)","Occupational Medicine Physician","Occupational Therapist (OT)","Ophthalmologist","Optometrist","Orthopedic Surgeon","Otolaryngologist (ENT)","Pain Medicine Specialist","Paramedic","Pathologist","Pediatric Cardiologist","Pediatric Endocrinologist","Pediatric Neurologist","Pediatric Oncologist","Pediatric Pulmonologist","Pediatrician","Pharmacist","Physical Medicine & Rehabilitation Physician","Physical Therapist (PT)","Physician Assistant (PA)","Plastic Surgeon","Preventive Medicine Physician","Primary Care Physician","Professional Counselor","Psychiatrist","Psychologist (Clinical)","Psychologist (Counseling)","Psychologist (Neuropsychology)","Pulmonologist","Radiation Oncologist","Radiologist (Diagnostic)","Recreational Therapist","Reproductive Endocrinologist / Infertility Specialist","Respiratory Therapist (RT)","Rheumatologist","Sleep Medicine Specialist","Speech-Language Pathologist (SLP)","Sports Medicine Physician","Substance Abuse Counselor","Thoracic Surgeon","Transplant Surgeon","Trauma Surgeon","Urologist","Vascular Surgeon"
];function ensureField(){var sel=document.getElementById("specialty");if(sel)return sel;var field=document.createElement("div");field.className="field";field.id="specialty-field";var lbl=document.createElement("label");lbl.setAttribute("for","specialty");lbl.textContent="Specialty";sel=document.createElement("select");sel.id="specialty";sel.name="specialty";field.appendChild(lbl);field.appendChild(sel);var form=document.querySelector("form");if(form){if(form.firstElementChild){form.insertBefore(field,form.firstElementChild.nextSibling);}else{form.appendChild(field);}}else{document.body.insertBefore(field,document.body.firstChild);}return sel;}function populate(sel){sel.innerHTML="";for(var i=0;i<SPECIALTIES.length;i++){var s=SPECIALTIES[i];var o=document.createElement("option");o.value=s;o.textContent=s;sel.appendChild(o);}var def=localStorage.getItem("specialty")||SPECIALTIES[0];sel.value=def;}function boot(){var sel=ensureField();populate(sel);sel.addEventListener("change",function(){try{localStorage.setItem("specialty",sel.value);}catch(e){}},{passive:true});window.getSpecialty=function(){return sel.value||"";};}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",boot,{once:true});}else{boot();}})();`;

app.get('/specialties.js', (req, res) => {
  const f = path.join(publicDir, 'specialties.js');
  if (fs.existsSync(f)) {
    res.type('application/javascript');
    return res.sendFile(f);
  }
  res.type('application/javascript').send(FALLBACK_SPECIALTIES_JS);
});

// inject the script tag into index.html on the fly so you don't need to edit the file
function injectSpecialtyScript(html) {
  if (!html) return html;
  if (/specialties\.js/.test(html)) return html; // already there
  return html.replace(/<\/body>\s*<\/html>/i, '  <script src="/specialties.js?v=1" defer></script>\n</body></html>');
}

/* ---------- Specialties API (optional, kept for compatibility) ---------- */
app.get('/api/specialties', async (_req, res) => {
  try {
    const list = [
      "Addiction Counselor","Addiction Medicine Physician","Advanced Practice Registered Nurse (APRN)",
      "Allergy / Immunology Physician","Anesthesiologist","Audiologist","Cardiologist",
      "Cardiothoracic Surgeon","Case Manager","Child & Adolescent Psychiatrist","Clinical Laboratory Scientist",
      "Clinical Mental Health Counselor","Clinical Nurse Specialist","Clinical Psychologist","Clinical Social Worker",
      "Coding and Billing Specialist","Colorectal Surgeon","Critical Care Physician / Intensivist","Cytopathologist",
      "Dermatologist","Developmental-Behavioral Pediatrician","Dietitian","Emergency Medical Technician (EMT)",
      "Emergency Medicine Physician","Endocrinologist","Family Medicine Physician","Forensic Pathologist",
      "Gastroenterologist","General Surgeon","Geneticist (Medical)","Geriatrician","Gynecologic Oncologist",
      "Hand Surgeon","Health Information Manager","Hematologist","Hematologist-Oncologist",
      "Hospice & Palliative Medicine Specialist","Hospitalist","Infectious Disease Specialist",
      "Internal Medicine Physician","Interventional Radiologist","Laboratory Technologist","Legal / Compliance Officer",
      "Licensed Marriage and Family Therapist (LMFT)","Licensed Professional Clinical Counselor (LPCC)",
      "Licensed Practical Nurse (LPN)","Licensed Vocational Nurse (LVN)","Maternal-Fetal Medicine Specialist",
      "Medical Assistant","Medical Geneticist","Medical Oncologist","Medical Scribe","Neonatologist","Nephrologist",
      "Neurologist","Neuropathologist","Neurosurgeon","Nuclear Medicine Physician","Nurse Anesthetist (CRNA)",
      "Nurse Midwife (CNM)","Nurse Practitioner (NP)","Obstetrician / Gynecologist (OB/GYN)",
      "Occupational Medicine Physician","Occupational Therapist (OT)","Ophthalmologist","Optometrist",
      "Orthopedic Surgeon","Otolaryngologist (ENT)","Pain Medicine Specialist","Paramedic","Pathologist",
      "Pediatric Cardiologist","Pediatric Endocrinologist","Pediatric Neurologist","Pediatric Oncologist",
      "Pediatric Pulmonologist","Pediatrician","Pharmacist","Physical Medicine & Rehabilitation Physician",
      "Physical Therapist (PT)","Physician Assistant (PA)","Plastic Surgeon","Preventive Medicine Physician",
      "Primary Care Physician","Professional Counselor","Psychiatrist","Psychologist (Clinical)",
      "Psychologist (Counseling)","Psychologist (Neuropsychology)","Pulmonologist","Radiation Oncologist",
      "Radiologist (Diagnostic)","Recreational Therapist","Reproductive Endocrinologist / Infertility Specialist",
      "Respiratory Therapist (RT)","Rheumatologist","Sleep Medicine Specialist","Speech-Language Pathologist (SLP)",
      "Sports Medicine Physician","Substance Abuse Counselor","Thoracic Surgeon","Transplant Surgeon","Trauma Surgeon",
      "Urologist","Vascular Surgeon"
    ];
    res.json({ specialties: list });
  } catch {
    res.json({ specialties: ["General Practice"] });
  }
});

/* ---------- Model call helper ---------- */
async function callModel({ system, user, temperature = 0.2 }) {
  const body = { model: MODEL_NAME, temperature, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
  const resp = await fetch(MODEL_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) {
    const t = await resp.text().catch(()=>'');
    throw new Error(`Model API error ${resp.status}: ${t || resp.statusText}`);
  }
  const j = await resp.json();
  const text = j?.choices?.[0]?.message?.content ?? j?.choices?.[0]?.text ?? '';
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

/* ---------- SOAP helpers ---------- */
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
    const specialty = s(req.body?.specialty);
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
      const base =
        'You are a clinical documentation assistant. Based ONLY on the provided Subjective and Objective text, ' +
        "write Assessment and Plan. Do not invent data. If insufficient information, return 'None provided.' " +
        'Return plain text with the two headings: Assessment, Plan. No markdown.';
      const system = specialty ? `${base} The clinical specialty context is: ${specialty}.` : base;
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

/* ---------- BIRP ---------- */
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
    const useInference = !!(req.body && req.body.useInference);
    const fields = normalizeBIRP(req.body || {});
    const userShaped = shapedBIRPText(fields);
    if (!useInference) {
      return res.json({ ok:true, text:userShaped, noteText:userShaped, note:userShaped, ...fields });
    }

    const system = `You are a clinical documentation assistant. Produce a BIRP note with the sections Behavior, Intervention, Response, Plan. Use ONLY the details provided; if a section is missing, output 'None provided.' exactly for that section. Do not invent or infer. Keep the style clinical and concise.`;

    const user =
`Behavior:
${normalizeNone(fields.behavior)}

Intervention:
${normalizeNone(fields.intervention)}

Response:
${normalizeNone(fields.response)}

Plan:
${normalizeNone(fields.plan)}`;

    const modelText = await callModel({ system, user, temperature: 0.1 });
    const parsed = parseBIRPSections(modelText || '');

    const text = shapedBIRPText({
      behavior: parsed.behavior || fields.behavior || '',
      intervention: parsed.intervention || '',
      response: parsed.response || '',
      plan: parsed.plan || ''
    });

    return res.json({ ok:true, text, noteText:text, note:text, ...fields });
  } catch (e) {
    console.error('BIRP generation failed:', e);
    res.status(500).json({ error: 'BIRP generation failed' });
  }
}

app.post('/api/birp', handleBIRP);

async function startServer(desired) {
  let p = Number(desired) || 5050;
  for (let i = 0; i < 10; i++) {
    try {
      const server = await new Promise((resolve, reject) => {
        const s = app.listen(p, () => resolve(s));
        s.on('error', reject);
      });
      console.log('server listening on ' + p);
      return server;
    } catch (err) {
      if (err && err.code === 'EADDRINUSE') {
        console.warn('port ' + p + ' in use, trying ' + (p + 1));
        p++;
        continue;
      }
      throw err;
    }
  }
  console.error('no available port starting at ' + desired);
  process.exit(1);
}

if (!module.parent) startServer(PORT);


app.use(require("./middleware/json-error"));

app.use(require('./middleware/json-error'));
