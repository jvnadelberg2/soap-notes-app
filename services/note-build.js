'use strict';
// services/note-build.js
// Helpers to normalize payload -> Subjective/Objective etc

function buildSubjective(body) {
  const H = body.histories || {};
  const rows = [];
  if (H.chiefComplaint) rows.push(`Chief Complaint: ${H.chiefComplaint}`);
  if (H.hpi) rows.push(`HPI: ${H.hpi}`);
  if (H.ros) rows.push(`Review of Systems: ${H.ros}`);
  if (H.allergies) rows.push(`Allergies: ${H.allergies}`);
  if (H.pmh) rows.push(`Past Medical History: ${H.pmh}`);
  if (H.psh) rows.push(`Past Surgical History: ${H.psh}`);
  if (H.familyHistory) rows.push(`Family History: ${H.familyHistory}`);
  if (H.socialHistory) rows.push(`Social History: ${H.socialHistory}`);
  return rows.join('\n');
}

function buildObjective(body) {
  const D = body.diagnostics || {};
  const V = D.vitals || {};
  const lines = [];
  const vit = [
    V.bp    && `BP ${V.bp}`,
    V.hr    && `HR ${V.hr} bpm`,
    V.temp  && `Temp ${V.temp} °F`,
    V.rr    && `RR ${V.rr}`,
    V.spo2  && `SpO₂ ${V.spo2}%`,
    V.height&& `Ht ${V.height} cm`,
    V.weight&& `Wt ${V.weight} kg`,
  ].filter(Boolean);
  if (vit.length) lines.push(`Vitals: ${vit.join('; ')}`);
  if (D.exam) lines.push(`Exam: ${D.exam}`);
  if (D.imagingLabs) lines.push(`Diagnostics: ${D.imagingLabs}`);
  if (body.medications) lines.push(`Medications: ${body.medications}`);
  if (body.orders) lines.push(`Orders: ${body.orders}`);
  return lines.join('\n');
}

function sanitize(text) {
  if (!text) return '';
  return String(text).replace(/None provided\.?/gi, '').trim();
}

module.exports = {
  buildSubjective,
  buildObjective,
  sanitize
};