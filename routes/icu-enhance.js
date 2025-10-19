'use strict';

const { v4: uuidv4 } = require('uuid');
const express = require('express');
const router = express.Router();
const { callModel } = require('../services/model-utils');

// ---------- Helpers ----------
function fiveBlanks() {
  return '\n\n\n\n\n';
}

function normalizeSection(text) {
  return text && text.trim() ? text.trim() : fiveBlanks();
}

// Canonical ICU organ systems (always printed)
const SYSTEMS = [
  'Respiratory',
  'Cardiovascular',
  'Neurologic',
  'Renal',
  'Gastrointestinal / Nutrition',
  'Infectious Disease',
  'Hematology',
  'Endocrine',
  'Lines / Tubes / Drains',
  'Prophylaxis & Disposition'
];

function planTemplate(contentMap = {}) {
  return SYSTEMS
    .map(sys => `${sys}:\n${normalizeSection(contentMap[sys] || '')}`)
    .join('\n\n');
}

function shapedICUText({ interval, objective, assessment, plan }) {
  return [
    'Interval Events',
    normalizeSection(interval),
    '',
    'Objective Data',
    normalizeSection(objective),
    '',
    'Assessment',
    normalizeSection(assessment),
    '',
    'Plan by System',
    planTemplate(plan)
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

// ---------- Route ----------
router.post('/api/icu-enhance', async (req, res) => {
  try {
    const { icuInterval, icuObjective, icuAssessment, icuPlan, model, assistLevel } = req.body || {};
    const level = Number(assistLevel) || 0;
    console.log("[/api/icu-enhance] Assist level:", level);

    // --- Standard placeholders for missing clinician input ---
    const intervalInput = icuInterval && icuInterval.trim()
      ? icuInterval.trim()
      : 'No significant interval events reported.';
    const objectiveInput = icuObjective && icuObjective.trim()
      ? icuObjective.trim()
      : 'No new objective data documented.';

    // Assist Level 0 — just echo typed text (with placeholders)
    if (level === 0) {
      const final = shapedICUText({
        interval: intervalInput,
        objective: objectiveInput,
        assessment: icuAssessment,
        plan: {}
      });
      return res.json({ ok: true, id: uuidv4(), generatedNote: final });
    }

    // If all main sections are blank, skip model call entirely
    if (
      (!icuInterval || !icuInterval.trim()) &&
      (!icuObjective || !icuObjective.trim()) &&
      (!icuAssessment || !icuAssessment.trim()) &&
      (!icuPlan || !icuPlan.trim())
    ) {
      const final = shapedICUText({
        interval: intervalInput,
        objective: objectiveInput,
        assessment: 'No assessment data reported.',
        plan: {}
      });
      return res.json({ ok: true, id: uuidv4(), generatedNote: final });
    }

    // --- Prompt for model ---
    const instruction = `
You are generating an ICU Progress Note in standard clinical format.

Rules:
- Keep "Interval Events" and "Objective Data" exactly as provided.
- Generate "Assessment" if blank, as a concise interpretive summary (do not include organ-system details here).
- Create "Plan by System" with these headers:
  Respiratory, Cardiovascular, Neurologic, Renal, Gastrointestinal / Nutrition,
  Infectious Disease, Hematology, Endocrine, Lines / Tubes / Drains,
  Prophylaxis & Disposition.
- Each organ system plan must appear ONLY under "Plan by System".
- Do NOT include system-level plans or interventions inside the Assessment.
- Provide realistic ICU content for applicable systems.
- Leave sections blank if not applicable.
- Output plain text only. No markdown, no bold, no disclaimers.
`;

    const prompt = `
${instruction}

Interval Events
${intervalInput}

Objective Data
${objectiveInput}

Assessment
${icuAssessment || ''}

Plan by System
${icuPlan || ''}
`;

    console.log('=== STRICT ICU PROMPT ===');
    console.log(prompt);
    console.log('==========================');

    // --- Call model ---
    const raw = await callModel({
      system:
        'You are a factual ICU documentation assistant. Follow the ICU Progress Note format exactly. Use ONLY provided information. Never add disclaimers.',
      user: prompt,
      temperature: 0.3,
      model,
      maxTokens: 1800
    });

    // === Assist Level 5: Full assessment, blank plan ===
    if (level === 5) {
      console.log("[/api/icu-enhance] Assist Level 5 — blank plan with headers only.");

      const assessmentMatch = raw.match(/Assessment[\s\S]*?(?=Plan by System|$)/i);
      const assessmentText = assessmentMatch
        ? assessmentMatch[0].replace(/^Assessment/i, '').trim()
        : icuAssessment || '';

      // Create a blank plan map (headers only, five blank lines each)
      const blankPlanMap = {};
      for (const sys of SYSTEMS) blankPlanMap[sys] = '\n\n\n\n\n';

      const finalText = shapedICUText({
        interval: intervalInput,
        objective: objectiveInput,
        assessment: assessmentText || fiveBlanks(),
        plan: blankPlanMap
      });

      return res.json({
        ok: true,
        id: uuidv4(),
        generatedNote: finalText
      });
    }

    console.log('=== RAW MODEL OUTPUT ===');
    console.log(raw);
    console.log('========================');

    const cleaned = raw
      .replace(/\*\*/g, '')
      .replace(/-{3,}/g, '')
      .trim();

    // --- Extract Assessment and Plan sections ---
    const assessmentMatch = cleaned.match(/Assessment[\s\S]*?(?=Plan by System|$)/i);
    const planMatch = cleaned.match(/Plan by System[\s\S]*$/i);

    const assessmentText = assessmentMatch
      ? assessmentMatch[0].replace(/^Assessment/i, '').trim()
      : icuAssessment || '';

    const planText = planMatch
      ? planMatch[0].replace(/^Plan by System/i, '').trim()
      : '';

    // --- Parse Plan into system blocks ---



    const planMap = {};
    for (const sys of SYSTEMS) {
  const pattern = new RegExp(`${sys}:\\s*([\\s\\S]*?)(?=(?:\\n[A-Z][^:\\n]+:|$))`, 'i');
  const m = planText.match(pattern);
  if (m && m[1].trim()) {
    planMap[sys] = m[1].trim();
  } else {
    // Default clinical phrasing instead of leaving blank or saying "None"
    planMap[sys] = 'Continue current management.';
  }
}

    // --- Determine assessment fallback ---
    let finalAssessment = assessmentText && assessmentText.trim() ? assessmentText.trim() : '';
    if (!finalAssessment) {
      const intervalBlank = !icuInterval || !icuInterval.trim();
      const objectiveBlank = !icuObjective || !icuObjective.trim();
      finalAssessment = intervalBlank && objectiveBlank
        ? 'No assessment data reported.'
        : fiveBlanks();
    }

    // --- Build Final Text ---
    const finalText = shapedICUText({
      interval: intervalInput,
      objective: objectiveInput,
      assessment: finalAssessment,
      plan: planMap
    });

    res.json({
      ok: true,
      id: uuidv4(),
      generatedNote: finalText
    });

  } catch (err) {
    console.error('[/api/icu-enhance] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;