'use strict';

const express = require('express');
const router = express.Router();
const { callModel } = require('../services/model-utils');

function fiveBlanks() {
  return '\n\n\n\n\n';
}

function normalizeSection(text) {
  if (!text || !text.trim()) return fiveBlanks();
  return text.trim();
}

function shapedBIRPText({ behavior, intervention, response, plan }) {
  return `Behavior
${normalizeSection(behavior)}

Intervention
${normalizeSection(intervention)}

Response
${normalizeSection(response)}

Plan
${normalizeSection(plan)}`;
}

// Parse headings out of model text if present
function parseBIRPSections(text) {
  const T = (text || '').replace(/\r\n/g, '\n');
  const names = ['Behavior', 'Intervention', 'Response', 'Plan'];
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

router.post('/api/birp-enhance', async (req, res) => {
  try {
    const {
      birpBehavior,
      birpIntervention,
      birpResponse,
      birpPlan,
      model,
      assistLevel
    } = req.body || {};

    const level = Number(assistLevel) || 0;
    console.log("[/api/birp-enhance] Assist level:", level);

    // Level 0 → just stitch together
    if (level === 0) {
      return res.json({
        generatedNote: shapedBIRPText({
          behavior: birpBehavior,
          intervention: birpIntervention,
          response: birpResponse,
          plan: birpPlan
        })
      });
    }

    // Instruction by level
    let instruction = "";
    switch (level) {
      case 1: instruction = "Rewrite each section briefly, ~1 sentence each."; break;
      case 2: instruction = "Write concise 1–2 sentence improvements for each section."; break;
      case 3: instruction = "Expand each section into 2–4 sentences of clinical draft."; break;
      case 4: instruction = "Expand into fuller clinical language with short paragraphs."; break;
      case 5: instruction = "Generate a comprehensive BIRP draft with detailed clinical phrasing."; break;
      default: instruction = "Improve clarity and completeness of this BIRP note.";
    }

    const prompt = `
${instruction}

Behavior: ${birpBehavior}
Intervention: ${birpIntervention}
Response: ${birpResponse}
Plan: ${birpPlan}
    `;

    const raw = await callModel({
      system: "You are a medical scribe assisting a licensed clinician. Always return a BIRP note with clear section headings (Behavior, Intervention, Response, Plan). Never add disclaimers.",
      user: prompt,
      temperature: 0.1,
      model,
      maxTokens: 1200
    });

    const parsed = parseBIRPSections(raw);
    const final = shapedBIRPText({
      behavior: parsed.behavior || birpBehavior,
      intervention: parsed.intervention || birpIntervention,
      response: parsed.response || birpResponse,
      plan: parsed.plan || birpPlan
    });

    res.json({ generatedNote: final });
  } catch (err) {
    console.error("[/api/birp-enhance] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
