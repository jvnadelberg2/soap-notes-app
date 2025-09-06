'use strict';

function byId(id) { return document.getElementById(id); }
function val(id)  { const el = byId(id); return el ? (el.value || '') : ''; }
function setStatus(msg){ const s = byId('status'); if (s) s.textContent = msg; }

function esc(s){
  return String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function br(s){ return esc(s).replace(/\n/g,'<br>'); }

function collectMeta() {
  return {
    provider: val('provider'),
    clinic: val('clinic'),
    specialty: val('specialty'),
    patient: val('patient'),
    mrn: val('mrn'),
    dob: val('dob'),
    sex: val('sex'),
    age: val('age'),
    model: val('model') || 'llama3.1:8b',
    timestamp: new Date().toISOString()
  };
}

function collectStructured() {
  return {
    schema_version: 'v2-structured',
    meta: collectMeta(),
    subjective: {
      chief_complaint: val('chiefComplaint'),
      hpi: val('hpi'),
      pmh: val('pmh'),
      fh:  val('fh'),
      sh:  val('sh')
    },
    objective: {
      ros: val('ros'),
      vitals: {
        bp:     val('vBP'),
        hr:     val('vHR'),
        rr:     val('vRR'),
        temp:   val('vTemp'),
        weight: val('vWeight'),
        o2_sat: val('vO2Sat')
      },
      diagnostics: val('diagnostics'),
      exam:        val('exam')
    }
  };
}

function joinVitalsLine(v) {
  const parts = [];
  if (v.bp) parts.push(`BP: ${v.bp}`);
  if (v.hr) parts.push(`HR: ${v.hr}`);
  if (v.rr) parts.push(`RR: ${v.rr}`);
  if (v.temp) parts.push(`Temp: ${v.temp}`);
  if (v.weight) parts.push(`Weight: ${v.weight}`);
  if (v.o2_sat) parts.push(`O2 Sat: ${v.o2_sat}`);
  return parts.join(' | ');
}

function renderSoapFromStructured(s) {
  const S = s.subjective || {};
  const O = s.objective || {};
  const V = O.vitals || {};

  const sb = [];

  // Bold headers, no underline lines, Helvetica handled via CSS in index.html.
  sb.push('<strong>Subjective</strong><br>');

  if (S.chief_complaint) sb.push('<em>Chief Complaint:</em><br>', br(S.chief_complaint), '<br><br>');
  if (S.hpi)             sb.push('<em>HPI:</em><br>',             br(S.hpi),             '<br><br>');
  if (S.pmh)             sb.push('<em>PMH:</em><br>',             br(S.pmh),             '<br><br>');
  if (S.fh)              sb.push('<em>FH:</em><br>',              br(S.fh),              '<br><br>');
  if (S.sh)              sb.push('<em>SH:</em><br>',              br(S.sh),              '<br><br>');

  sb.push('<strong>Objective</strong><br>');

  const vitalsLine = joinVitalsLine(V);
  if (O.ros)         sb.push('<em>ROS:</em><br>',          br(O.ros),          '<br><br>');
  if (vitalsLine)    sb.push('<em>Vital Signs:</em><br>',  esc(vitalsLine),    '<br><br>');
  if (O.diagnostics) sb.push('<em>Diagnostics:</em><br>',  br(O.diagnostics),  '<br><br>');
  if (O.exam)        sb.push('<em>Exam:</em><br>',         br(O.exam),         '<br><br>');

  sb.push('<strong>Assessment</strong><br>', br(s.assessment || ''), '<br><br>');
  sb.push('<strong>Plan</strong><br>',       br(s.plan || ''));

  const html = sb.join('').replace(/(<br>){3,}/g,'<br><br>');
  const out = byId('soapTextOut');
  if (out) out.innerHTML = html; // only inline tags, safe inside <pre>
  return html;
}

async function callModel(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('/api/generate-soap-json-annotated', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: e && e.message ? String(e.message) : 'request failed' };
  } finally {
    clearTimeout(timeout);
  }
}

/* Accept capitalized/lowercase roots and nested keys; support {data:{...}} wrapper. */
function applyApiResponseToDom(api, fallbackPayload) {
  const fallback = fallbackPayload || {};
  if (!api || typeof api !== 'object') {
    // Always render from form even if model missing
    renderSoapFromStructured({ ...fallback, assessment: '', plan: '' });
    return false;
  }

  const root = (api && typeof api.data === 'object') ? api.data : api;

  const S_in_raw = root.subjective || root.Subjective || {};
  const O_in_raw = root.objective || root.Objective || {};
  const V_in_raw = (O_in_raw.vitals || O_in_raw.Vitals || {});

  const S_in = (typeof S_in_raw === 'object' && S_in_raw) ? S_in_raw : {};
  const O_in = (typeof O_in_raw === 'object' && O_in_raw) ? O_in_raw : {};
  const V_in = (typeof V_in_raw === 'object' && V_in_raw) ? V_in_raw : {};

  const S_fb = fallback.subjective || {};
  const O_fb = fallback.objective  || {};
  const V_fb = O_fb.vitals || {};

  const S = {
    chief_complaint: S_in.chief_complaint ?? S_in.chiefComplaint ?? S_fb.chief_complaint ?? '',
    hpi:             S_in.hpi ?? S_in.HPI ?? S_fb.hpi ?? '',
    pmh:             S_in.pmh ?? S_in.PMH ?? S_fb.pmh ?? '',
    fh:              S_in.fh  ?? S_in.FH  ?? S_fb.fh  ?? '',
    sh:              S_in.sh  ?? S_in.SH  ?? S_fb.sh  ?? ''
  };

  const V = {
    bp:      V_in.bp ?? V_in.BP ?? V_fb.bp ?? '',
    hr:      V_in.hr ?? V_in.HR ?? V_fb.hr ?? '',
    rr:      V_in.rr ?? V_in.RR ?? V_fb.rr ?? '',
    temp:    V_in.temp ?? V_in.Temp ?? V_fb.temp ?? '',
    weight:  V_in.weight ?? V_in.Weight ?? V_fb.weight ?? '',
    o2_sat:  V_in.o2_sat ?? V_in.O2Sat ?? V_in['O2 Sat'] ?? V_fb.o2_sat ?? ''
  };

  const O = {
    ros:          O_in.ros ?? O_in.ROS ?? O_fb.ros ?? '',
    vitals:       V,
    diagnostics:  O_in.diagnostics ?? O_in.Diagnostics ?? O_fb.diagnostics ?? '',
    exam:         O_in.exam ?? O_in.Exam ?? O_fb.exam ?? ''
  };

  const assessment = (root.assessment ?? root.Assessment ?? '').toString();
  const plan       = (root.plan ?? root.Plan ?? '').toString();

  renderSoapFromStructured({
    schema_version: 'v2-structured',
    meta: fallback.meta || {},
    subjective: S,
    objective: O,
    assessment,
    plan
  });

  // Return true if we actually received at least one of assessment/plan
  return Boolean(assessment || plan);
}

async function onGenerate() {
  const payload = collectStructured();
  setStatus('Sending to model…');

  const res = await callModel(payload);
  if (!res.ok) {
    // Render from form even if model fails (so never “empty” output)
    renderSoapFromStructured({ ...payload, assessment: '', plan: '' });
    setStatus(`Model request failed: ${res.error}`);
    return;
  }

  const used = applyApiResponseToDom(res.data, payload);
  setStatus(used ? 'Model response applied.' : 'Model responded without A/P; rendered form data.');
}

function onToggleEditable() {
  const out = byId('soapTextOut');
  const chk = byId('toggleEditable');
  if (!out || !chk) return;
  const editable = chk.checked;
  if (editable) {
    out.setAttribute('contenteditable', 'true');
    out.setAttribute('tabindex', '0');
  } else {
    out.removeAttribute('contenteditable');
    out.removeAttribute('tabindex');
  }
}

function wire() {
  const gen = byId('btnGenerate');
  const chk = byId('toggleEditable');
  if (gen) gen.addEventListener('click', onGenerate);
  if (chk) chk.addEventListener('change', onToggleEditable);
}

document.addEventListener('DOMContentLoaded', wire);
