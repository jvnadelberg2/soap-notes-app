'use strict';
/**
 * routes/generate-note.js — robust, model-first generator route
 * - Composes Subjective/Objective from payload
 * - Calls services/ai.js via a stable interface (generate), with safe fallbacks
 * - Logs file paths and available exports to avoid “mystery” mismatches
 */

const express = require('express');
const router = express.Router();

// Resolve ai path visibly so we know which file is loaded
let ai;
let aiPath = '';
try {
  aiPath = require.resolve('../services/ai');
  ai = require('../services/ai');
  console.log('[generate-note] using ai module at:', aiPath);
  console.log('[generate-note] ai exports:', Object.keys(ai || {}));
} catch (e) {
  console.error('[generate-note] failed to load ../services/ai:', e);
  throw e;
}

router.use(express.json({ limit: '1mb' }));
router.use(express.urlencoded({ extended: true }));

/* ---------------- helpers to compose S/O strings ---------------- */
function collectSubjective(body = {}) {
  const h = body.histories || {};
  const out = [];
  if (h.chiefComplaint) out.push('Chief Complaint: ' + h.chiefComplaint);
  if (h.hpi) out.push('HPI: ' + h.hpi);
  if (h.pmh) out.push('Past Medical History: ' + h.pmh);
  if (h.psh) out.push('Past Surgical History: ' + h.psh);
  if (h.familyHistory) out.push('Family History: ' + h.familyHistory);
  if (h.socialHistory) out.push('Social History: ' + h.socialHistory);
  if (h.ros) out.push('Review of Systems: ' + h.ros);
  if (h.allergies) out.push('Allergies: ' + h.allergies);
  return out.join('\n');
}

function collectObjective(body = {}) {
  const d = body.diagnostics || {};
  const rows = [];
  const v = d.vitals || {};
  const vitals = [];
  if (v.bp) vitals.push('BP ' + v.bp);
  if (v.hr) vitals.push('HR ' + v.hr + (String(v.hr).match(/bpm$/) ? '' : ' bpm'));
  if (v.temp) vitals.push('Temp ' + v.temp + (String(v.temp).match(/°F|°C|F|C$/) ? '' : ' °F'));
  if (v.rr) vitals.push('RR ' + v.rr);
  if (v.spo2) vitals.push('SpO₂ ' + v.spo2 + (String(v.spo2).includes('%') ? '' : '%'));
  if (v.height) vitals.push('Ht ' + v.height);
  if (v.weight) vitals.push('Wt ' + v.weight);
  if (vitals.length) rows.push('Vitals: ' + vitals.join('; '));
  if (d.exam) rows.push('Exam: ' + d.exam);
  if (d.imagingLabs) rows.push('Diagnostics: ' + d.imagingLabs);
  return rows.join('\n');
}

/* ---------------- main handler ---------------- */
router.post('/api/generate-note', async (req, res) => {
  try {
    const body = Object(req.body || {});
    const assistLevel = Number(body.assistLevel || 0);
    const model = String(body.model || '').trim() || 'llama3';
    const noteType = (String(body.noteType || 'SOAP').toUpperCase() === 'BIRP') ? 'BIRP' : 'SOAP';
    const specialty = String(body.specialty || '');

    const subjective = collectSubjective(body);
    const objective  = collectObjective(body);

    console.log('[generate-note] assistLevel=', assistLevel, 'model=', model, 'noteType=', noteType);
    console.log('[generate-note] S/O preview →', { S_len: subjective.length, O_len: objective.length });

    // Choose the best available AI function
    const fn =
      ai.generate ||
      ai.generateSoapNote ||
      ai.generateSOAP ||
      ai.generateSections;

    if (typeof fn !== 'function') {
      throw new Error('services/ai.js: no callable generate function found. Exports: ' + Object.keys(ai || {}).join(', '));
    }
console.log("[generate-note] fn is", fn?.name || typeof fn);
    const result = await fn({
      body, subjective, objective, specialty, assistLevel, model, noteType
    });

    // Normalize to sections + text
    let sections = {};
    if (result && result.sections) {
      sections = {
        subjective: String(result.sections.subjective || ''),
        objective:  String(result.sections.objective  || ''),
        assessment: String(result.sections.assessment || ''),
        plan:       String(result.sections.plan       || '')
      };
    } else if (typeof result?.text === 'string') {
      // Split flat SOAP by headers if only text returned
      const out = { subjective:'', objective:'', assessment:'', plan:'' };
      const lines = result.text.replace(/\r/g,'').split('\n');
      let cur = null;
      const hdr = s => {
        s = String(s||'').trim().toLowerCase().replace(/:$/,'');
        return ['subjective','objective','assessment','plan'].includes(s) ? s : null;
      };
      for (const ln of lines) {
        const h = hdr(ln);
        if (h) { cur = h; continue; }
        if (!cur) continue;
        out[cur] += (out[cur] ? '\n' : '') + ln;
      }
      sections = out;
    } else {
      sections = { subjective, objective, assessment:'', plan:'' };
    }

    const text = [
      'Subjective:', sections.subjective,
      '',
      'Objective:', sections.objective,
      '',
      'Assessment:', sections.assessment,
      '',
      'Plan:', sections.plan
    ].join('\n');

    console.log('[generate-note] done → lengths:', {
      S: sections.subjective.length,
      O: sections.objective.length,
      A: sections.assessment.length,
      P: sections.plan.length
    });

    res.json({ ok: true, sections, text, noteType });
  } catch (err) {
    console.error('generate-note failed:', err);
    res.status(500).json({ ok: false, error: { code: 'GENERATE_FAILED', message: err.message } });
  }
});

module.exports = router;