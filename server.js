'use strict';
require("dotenv").config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const net = require('net');
const { v4: uuidv4 } = require('uuid');

const { callModel } = require('./services/model-utils');
const { checkSigningKeys } = require('./services/key-health');
const { metricsMiddleware, metricsHandler } = require('./observability/metrics');
const store = require('./services/store');
const { renderNotePDF } = require('./services/pdf');

const notesApi = require('./routes/notes-api');

const app = express();

const { setupGoogleAuth } = require("./auth/google");

// attach Google OAuth
setupGoogleAuth(app);

const exportPdf = require('./routes/export-pdf');
const icdRouter = require('./routes/icd-api');

const SK = checkSigningKeys();



/* -------------------- App & Config -------------------- */
app.use(metricsMiddleware());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

const PORT = Number(process.env.PORT) || 5050;
const MODEL_API_URL = (process.env.MODEL_API_URL || 'http://localhost:11434/v1/chat/completions').trim();
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.1:8b';

if (process.env.REQUIRE_SIGNING_KEYS === '1' && !SK.ok) {
  console.error('[startup] signing keys missing:', SK.reasons.join('; '));
  process.exit(1);
} else if (!SK.ok) {
  console.warn('[startup] signing keys not fully configured:', SK.reasons.join('; '));
}

/* -------------------- Feature Routers -------------------- */

const generateNote = require('./routes/generate-note');
app.use(generateNote);

const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));


// Expose session idle timeout from env
app.get("/session-config.js", (req, res) => {
  const idle = Number(process.env.SESSION_IDLE_MINUTES || 30);
  res.type("application/javascript");
  res.send(`window.__SESSION_IDLE_MINUTES__ = ${idle};`);
});



app.use('/api', notesApi);
app.use('/', exportPdf);
app.use('/api/icd', icdRouter);
app.use('/', require('./routes/birp-export-pdf'));

/* -------------------- Meta / Health -------------------- */

app.get('/admin/metrics', metricsHandler);

const { execSync } = require("child_process");

app.get('/health', (_req, res) => {
  const indexExists = fs.existsSync(path.join(publicDir, 'index.html'));
  res.json({ ok: true, publicDir, indexExists, modelApi: MODEL_API_URL, modelName: MODEL_NAME });
});




/* -------------------- Model listing -------------------- */

app.get("/api/models", async (_req, res) => {
  // 1) Try Ollama HTTP API
  try {
    const r = await fetch("http://127.0.0.1:11434/api/tags", { method: "GET" });
    if (r.ok) {
      const data = await r.json();
      const names = (data.models || [])
        .map(m => m && m.name)
        .filter(Boolean);
      if (names.length) {
        return res.json({ models: Array.from(new Set(names)) });
      }
    }
  } catch (e) {
    console.warn("[/api/models] HTTP API check failed:", e.message);
  }

  // 2) Fallback to CLI (covers older/odd setups)
  try {
    const cmd = "/usr/local/bin/ollama list --format json || ollama list --format json";
    const output = execSync(cmd, { encoding: "utf8", shell: "/bin/bash" });
    const names = output
      .trim()
      .split("\n")
      .map(line => {
        try { return JSON.parse(line).name; } catch { return null; }
      })
      .filter(Boolean);

    return res.json({ models: Array.from(new Set(names)) });
  } catch (err) {
    console.error("[/api/models] CLI fallback failed:", err.message);
  }

  // 3) Last-resort fallback so the UI isn’t empty
  return res.json({ models: ["llama3.1:8b"] });
});

/* -------------------- Specialty script & API -------------------- */

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

function injectSpecialtyScript(html) {
  if (!html) return html;
  if (/specialties\.js/.test(html)) return html;
  return html.replace(/<\/body>\s*<\/html>/i, '  <script src="/specialties.js?v=1" defer></script>\n</body></html>');
}

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

/* -------------------- SOAP helpers -------------------- */

function s(x){ return (x ?? '').toString().trim(); }
function fiveBlanks(){ return '\n\n\n\n\n'; }

function normalizeNone(txt){
  const t = (txt || '').trim();
  if (!t) return fiveBlanks();
  if (/^\n\n\n\n\n\b/i.test(t)) return fiveBlanks();
  if (/^none\b/i.test(t)) return fiveBlanks();
  if (/due to lack of information/i.test(t)) return fiveBlanks();
  return t;
}

function computeSubjective(body){
  const cc        = s(body.chiefComplaint);
  const hpi       = s(body.hpi);
  const pmh       = s(body.pmh);
  const psh       = s(body.psh);
  const fh        = s(body.familyHistory);
  const sh        = s(body.socialHistory);
  const ros       = s(body.ros);
  const allergies = s(body.allergies);

  const parts = [];
  if (cc)  parts.push(`Chief Complaint: ${cc}`);
  if (hpi) parts.push(`HPI: ${hpi}`);
  if (pmh) parts.push(`PMH: ${pmh}`);
  if (psh) parts.push(`PSH: ${psh}`);
  if (fh)  parts.push(`FH: ${fh}`);
  if (sh)  parts.push(`SH: ${sh}`);
  if (ros) parts.push(`ROS: ${ros}`);
  if (allergies) parts.push(`Allergies: ${allergies}`);

  return parts.length ? parts.join('\n') : fiveBlanks();
}

function computeObjective(body) {
  const vBP     = s(body.vBP     || body.bp);
  const vHR     = s(body.vHR     || body.hr);
  const vRR     = s(body.vRR     || body.rr);
  const vTemp   = s(body.vTemp   || body.temp);
  const vWeight = s(body.vWeight || body.weight);
  const vO2Sat  = s(body.vO2Sat  || body.spo2);
  const height  = s(body.height);
  const pain    = s(body.painScore);
  const diag    = s(body.diagnostics || body.labs);
  const exam    = s(body.exam || body.physicalExam);
  const meds    = s(body.medications);

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

  if (meds) parts.push(`Medications: ${meds}`);
  if (diag) parts.push(`Diagnostics: ${diag}`);
  if (exam) parts.push(`Exam: ${exam}`);

  return parts.length ? parts.join('\n') : fiveBlanks();
}
function hasAnyClinicalInput(body){
  const fields = [
    body.chiefComplaint, body.hpi, body.pmh, body.fh, body.sh, body.ros,
    body.vBP, body.vHR, body.vRR, body.vTemp, body.vWeight, body.vO2Sat, body.height, body.painScore,
    body.diagnostics, body.exam, body.allergies, body.medications
  ];
  return fields.some(v => s(v));
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

/* -------------------- Refusal scrubber -------------------- */

function scrubRefusals(txt){
  const t = (txt || '');
  const pat = /(cannot\s+provide|cannot\s+give|not\s+able\s+to\s+provide|decline\s+to|i\s+cannot|i\s+can(?:not|'t)\s+create|consult\s+a\s+qualified|seek\s+medical|as\s+an\s+ai|i\s+am\s+not\s+a\s+doctor|for\s+informational\s+purposes\s+only)/i;
  if (!t.trim()) return fiveBlanks();
  return pat.test(t) ? fiveBlanks() : t;
}

/* -------------------- SOAP endpoint -------------------- */

async function handleSoap(req, res){
  try{
    console.log(">>> Incoming /api/soap body:", req.body);
    const lvlRaw = Number.parseInt(req.body?.assistLevel, 10);
    // ✅ allow up to level 5
    const assistLevel = Number.isFinite(lvlRaw) ? Math.max(0, Math.min(5, lvlRaw)) : 1;
    const useInference = assistLevel > 0;

    const specialty = s(req.body?.specialty);
    const model = s(req.body?.model);

    const subj = computeSubjective(req.body || {});
    const obj  = computeObjective(req.body || {});
    const anyInput = hasAnyClinicalInput(req.body || {});

    if (!useInference) {
      const finalText = shapeSOAP({ subj, obj, assess: fiveBlanks(), plan: fiveBlanks() });
      return res.json({ 
        ok:true, 
        id: uuidv4(),              // 👈 added UUID
        text: finalText, 
        noteText: finalText, 
        note: finalText 
      });
    }

    let assess = ' ';
    let plan   = ' ';

    if (anyInput) {
      const base =
        'You are a medical scribe assisting a licensed clinician. Produce a DRAFT for the clinician to review. Do not provide patient-facing advice. Use cautious clinical phrasing such as "assessment considers", "may be consistent with", "recommendations include". Never refuse, never add warnings, disclaimers, or apologies. Use only the provided Subjective and Objective text; do not add facts not present. If information is insufficient, output exactly five blank lines for that section. Return plain text with exactly two sections labeled Assessment and Plan.';

      let levelDirective = '';
      if (assistLevel === 1) {
        levelDirective = 'Assessment: 1–2 sentences. Plan: blank lines.';
      } else if (assistLevel === 2) {
        levelDirective = 'Assessment: 1–2 sentences. Plan: 1–2 sentences.';
      } else if (assistLevel === 3) {
        levelDirective = 'Assessment: full and complete, approximately 250–400 words with differentials and key justifications grounded in the provided data. Plan: 1–2 sentences or 2–4 short lines.';
      } else if (assistLevel === 4) {
        levelDirective = 'Assessment: full and complete, ≥350 words, include differential considerations supported by provided findings only. Plan: full and complete, ≥350 words, structured as short lines grouped by problem; include follow-up and monitoring phrased as recommendations for clinician review.';
      } else if (assistLevel === 5) {
        levelDirective = 'Assessment: full and complete, ≥350 words with differential considerations. Plan: blank lines.';
      }

      const system = specialty
        ? `${base} Clinical specialty: ${specialty}. ${levelDirective}`
        : `${base} ${levelDirective}`;

      const user =
`Subjective:
${subj}

Objective:
${obj}

Return plain text with EXACTLY two sections in this order and with these headings:
Assessment:
<content>

Plan:
<content>`;

      const maxTokens = assistLevel >= 4 ? 3600
                          : assistLevel === 3 ? 2400
                          : assistLevel === 2 ? 1200
                          : 800;

      const modelText = await callModel({ system, user, temperature: 0.1, model, maxTokens });
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

      assess = scrubRefusals(normalizeNone(assess || ''));
      plan   = scrubRefusals(normalizeNone(plan || ''));
    } else {
      assess = fiveBlanks();
      plan   = fiveBlanks();
    }

    // ✅ enforce blank Plan for Levels 1 and 5
    if (assistLevel === 1 || assistLevel === 5) {
      plan = fiveBlanks();
    }

    const finalText = shapeSOAP({ subj, obj, assess, plan });
    return res.json({ 
      ok:true, 
      id: uuidv4(),                // 👈 added UUID
      text: finalText, 
      noteText: finalText, 
      note: finalText 
    });
  } catch (e) {
    console.error("handleSoap failed:", e);
    res.status(500).json({ ok:false, error:'Error generating SOAP note.' });
  }
}

app.post('/api/generate-soap-json-annotated', handleSoap);
app.post('/api/generate_soap', handleSoap);
app.post('/api/soap', handleSoap);

/* -------------------- BIRP helpers/endpoints -------------------- */

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
    const model = s(req.body?.model);
    
    const userShaped = shapedBIRPText(fields);

    if (!useInference) {
      return res.json({ ok:true,         id: uuidv4(),    text:userShaped, noteText:userShaped, note:userShaped, ...fields });
    }

    const system = 'You are a medical scribe assisting a licensed clinician. Produce a DRAFT BIRP note for clinician review. Never refuse or add disclaimers. Use only the details provided; if a section is missing, output exactly five blank lines. Keep style clinical and concise.';

    const user =
`Behavior:
${normalizeNone(fields.behavior)}

Intervention:
${normalizeNone(fields.intervention)}

Response:
${normalizeNone(fields.response)}

Plan:
${normalizeNone(fields.plan)}`;

    const modelText = await callModel({ system, user, temperature: 0.1, model, maxTokens: 1500 });
    const parsed = parseBIRPSections(modelText || '');

    const text = shapedBIRPText({
      behavior: scrubRefusals(parsed.behavior || fields.behavior || ''),
      intervention: scrubRefusals(parsed.intervention || ''),
      response: scrubRefusals(parsed.response || ''),
      plan: scrubRefusals(parsed.plan || '')
    });

    return res.json({ ok:true, text, noteText:text, note:text, ...fields });
  } catch (e) {
    res.status(500).json({ error: 'BIRP generation failed' });
  }
}
app.post('/api/birp', handleBIRP);



app.post("/api/sign", (req, res) => {
  try {
    const id = String(req.body?.id || "").trim();
    const noteText = String(req.body?.noteText || "").trim();
    const provider = String(req.body?.provider || "").trim(); // required signer

    if (!id || !noteText || !provider) {
      return res.status(400).json({ ok: false, error: "Missing id, noteText, or provider" });
    }

    const signatureId = uuidv4();
    const signedAt = new Date().toISOString();

    const signedRecord = {
      id,
      noteText,
      provider,
      providerId: String(req.body?.providerId || ""),   // optional unique ID/email/NPI
      specialty: String(req.body?.specialty || ""),
      model: String(req.body?.model || ""),
      assistLevel: Number(req.body?.assistLevel) || null,
      patientId: String(req.body?.patientId || ""),
      signatureId,
      signedAt,
      clientIp: req.ip,
      userAgent: req.headers["user-agent"] || "",
      body: req.body,   
      finalized: true // preserve the full request for audit (includes SOAP/BIRP fields)
    };

    console.log("Signed record:", signedRecord);

    return res.json({ ok: true, ...signedRecord });
  } catch (err) {
    console.error("Sign failed", err);
    res.status(500).json({ ok: false, error: "Signing failed" });
  }
});





/* -------------------- ICD suggestions -------------------- */

function cleanQueries(lines){
  const out = [];
  const seen = new Set();
  for (let s of lines){
    s = (s||'').toLowerCase().trim().replace(/^[\-\d\.\)]\s*/,'');
    if (!s) continue;
    if (s.length>40) continue;
    const toks = s.split(/\s+/).filter(w=>{
      if (w.length<=3 && !['uti','uri','lri','cva','tia','dka','hiv','copd','chf','cad','ckd','pna','aom','ome','mi','afib'].includes(w)) return false;
      return !['the','a','an','and','of','to','in','on','with','for','at','by','from'].includes(w);
    });
    if (!toks.length) continue;
    const q = toks.join(' ');
    if (seen.has(q)) continue;
    seen.add(q);
    out.push(q);
  }
  return out.slice(0,8);
}

app.post('/api/icd/suggest', async (req, res, next) => {
  try {
    const {
      subjective = '',
      objective = '',
      assessment = '',
      plan = '',
      noteText = '',
      maxQueries = 8,
      perQueryLimit = 12,
      sex = '',
      age
    } = req.body || {};

    const text = (noteText && String(noteText).trim())
      ? String(noteText).trim().slice(0, 6000)
      : [
          subjective && `Subjective:\n${subjective}`,
          objective && `Objective:\n${objective}`,
          assessment && `Assessment:\n${assessment}`,
          plan && `Plan:\n${plan}`,
        ].filter(Boolean).join('\n\n').slice(0, 6000);

    const system =
`You extract short clinical search phrases for ICD-10-CM lookups from a clinical note. Output 3–8 distinct phrases, one per line, lowercase, 1–4 words. Avoid vague words and stopwords. Do not output ICD codes. Prefer specific diagnostic terms and common clinical abbreviations.`;

    const user =
`Clinical note:
${text}

rules:
- only phrases (1–4 words), lowercase
- no codes, no punctuation, no numbering
- include synonyms when helpful (e.g., "uti", "pneumonia", "hypertension", "diabetes mellitus", "gerd")
- avoid non-diagnostic words`;

    const resp = await callModel({ system, user, temperature: 0.1, maxTokens: 220 });
    const raw = String(resp || '').split(/\r?\n/);
    const queries = cleanQueries(raw).slice(0, Math.max(1, Math.min(8, maxQueries)));

    const base = `${req.protocol}://${req.get('host')}`;
    async function icdSearch(q) {
      const r = await fetch(`${base}/api/icd/search?q=${encodeURIComponent(q)}&limit=${perQueryLimit}&sex=${encodeURIComponent(sex||'')}&age=${encodeURIComponent(typeof age==='number'?age:'')}`);
      if (!r.ok) return [];
      return r.json();
    }

    const perQuery = [];
    const map = new Map();
    for (const q of queries) {
      const hits = await icdSearch(q);
      perQuery.push({ query: q, hits });
      hits.forEach((h, idx) => {
        const key = h.code;
        const cur = map.get(key) || { code: h.code, description: h.description, freq: 0, pos: [] };
        cur.freq += 1;
        cur.pos.push(idx + 1);
        map.set(key, cur);
      });
    }

    const ranked = Array.from(map.values()).map(x => ({
      code: x.code,
      description: x.description,
      freq: x.freq,
      avgPos: x.pos.reduce((a,b)=>a+b,0) / x.pos.length
    })).sort((a,b) => (
      (b.freq - a.freq) ||
      (a.avgPos - b.avgPos) ||
      (a.code.localeCompare(b.code))
    ));

    const top = ranked.slice(0, 5).map(({code, description}) => ({code, description}));
    res.json({ ok: true, queries, top, perQuery });
  } catch (err) {
    next(err);
  }
});

/* -------------------- Error middleware & server start -------------------- */

app.use(require('./middleware/json-error'));

app.use('/', require('./routes/birp-enhance'));

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