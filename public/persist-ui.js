/* BEGIN:ARCH-COMMENT
File: public/persist-ui.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';

const PERSIST_KEY = 'soap_notes_form_v2';

function byId(id){ return document.getElementById(id); }

function collect(){
  const pick = id => (byId(id)?.value ?? '');
  return {
    provider: pick('provider'),
    clinic:   pick('clinic'),
    specialty: pick('specialty'),
    patient:  pick('patient'),
    mrn:      pick('mrn'),
    dob:      pick('dob'),
    sex:      pick('sex'),
    age:      pick('age'),

    chiefComplaint: pick('chiefComplaint'),
    hpi:            pick('hpi'),
    pmh:            pick('pmh'),
    fh:             pick('fh'),
    sh:             pick('sh'),
    ros:            pick('ros'),

    vBP: pick('vBP'),
    vHR: pick('vHR'),
    vRR: pick('vRR'),
    vTemp: pick('vTemp'),
    vWeight: pick('vWeight'),
    vO2Sat: pick('vO2Sat'),

    diagnostics: pick('diagnostics'),
    exam:        pick('exam'),

    model: pick('model')
  };
}

function apply(data){
  const set = (id, v) => { const el = byId(id); if (el && typeof v === 'string') el.value = v; };
  if (!data || typeof data !== 'object') return;

  set('provider', data.provider);
  set('clinic',   data.clinic);
  set('specialty',data.specialty);
  set('patient',  data.patient);
  set('mrn',      data.mrn);
  set('dob',      data.dob);
  set('sex',      data.sex);
  set('age',      data.age);

  set('chiefComplaint', data.chiefComplaint);
  set('hpi',            data.hpi);
  set('pmh',            data.pmh);
  set('fh',             data.fh);
  set('sh',             data.sh);
  set('ros',            data.ros);

  set('vBP', data.vBP);
  set('vHR', data.vHR);
  set('vRR', data.vRR);
  set('vTemp', data.vTemp);
  set('vWeight', data.vWeight);
  set('vO2Sat', data.vO2Sat);

  set('diagnostics', data.diagnostics);
  set('exam',        data.exam);

  set('model', data.model);
}

function save(){
  if (window.__suppressPersist) return;
  try { localStorage.setItem(PERSIST_KEY, JSON.stringify(collect())); } catch {}
}

function load(){
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    apply(data);
  } catch {}
}

function wire(){
  const ids = [
    'provider','clinic','specialty','patient','mrn','dob','sex','age',
    'chiefComplaint','hpi','pmh','fh','sh','ros',
    'vBP','vHR','vRR','vTemp','vWeight','vO2Sat',
    'diagnostics','exam','model'
  ];
  ids.forEach(id => {
    const el = byId(id);
    if (!el) return;
    el.addEventListener('input', save, { passive: true });
    el.addEventListener('change', save, { passive: true });
  });
}

document.addEventListener('DOMContentLoaded', () => { load(); wire(); });
