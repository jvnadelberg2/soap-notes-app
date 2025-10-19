'use strict';

const { v4: uuidv4 } = require('uuid');
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
    const { birpBehavior, birpIntervention, birpResponse, birpPlan, model, assistLevel } = req.body || {};
    const level = Number(assistLevel) || 0;
    console.log("[/api/birp-enhance] Assist level:", level);

    if (level === 0) {
      const final = shapedBIRPText({
        behavior: birpBehavior,
        intervention: birpIntervention,
        response: birpResponse,
        plan: birpPlan
      });
      return res.json({ ok: true, id: uuidv4(), generatedNote: final, noteText: final, note: final });
    }

    // Pick model instructions
    let instruction = "";
    switch (level) {
      case 1: instruction = "Rewrite each section briefly, ~1 sentence each."; break;
      case 2: instruction = "Write concise 1–2 sentence improvements for each section."; break;
      case 3: instruction = "Expand each section into 2–4 sentences of clinical draft."; break;
      case 4: instruction = "Expand into fuller clinical language with short paragraphs."; break;
      case 5: instruction = "As a clinical documentation assistant, expand each section into a thorough, detailed BIRP note using professional language. Do not diagnose or prescribe — just describe behavior, interventions, responses, and plans clearly."; break;
      default: instruction = "Improve clarity and completeness of this BIRP note.";
    }

    const prompt = `
${instruction}

Behavior: ${birpBehavior}
Intervention: ${birpIntervention}
Response: ${birpResponse}
Plan: ${birpPlan}
`;
console.log("=== BIRP prompt ===");
console.log(prompt);
console.log("===================");



    const raw = await callModel({
      system: "You are a medical scribe assisting a licensed clinician. Always return a BIRP note with clear section headings (Behavior, Intervention, Response, Plan). Never add disclaimers.",
      user: prompt,
      temperature: 0.1,
      model,
      maxTokens: 1200
    });


// 🧹 Remove markdown bold markers
// 🧹 Remove markdown bold markers
const cleaned = raw.replace(/\*\*/g, "");
const parsed = parseBIRPSections(cleaned);


console.log("=== RAW MODEL OUTPUT ===");
console.log(cleaned);
console.log("========================");


    // --- TELEHEALTH HEADER ---
    let telehealthBlock = "";
    if (req.body.telePlatform || req.body.teleModality || req.body.telePatientLocation || req.body.teleConsentAt) {
      const tele = [];
      if (req.body.telePlatform) tele.push(`Platform: ${req.body.telePlatform}`);
      if (req.body.teleModality) tele.push(`Modality: ${req.body.teleModality}`);
      if (req.body.telePatientLocation) tele.push(`Patient Location: ${req.body.telePatientLocation}`);
      if (req.body.teleConsent) {
        tele.push(`Consent: Yes${req.body.teleConsentAt ? ` (${req.body.teleConsentAt})` : ""}`);
      } else if (req.body.teleConsentAt) {
        tele.push(`Consent Timestamp: ${req.body.teleConsentAt}`);
      }
      telehealthBlock = `Telehealth Encounter\n${tele.join("\n")}\n\n`;
    }

    // --- Combine Telehealth + Note ---
    const finalText = telehealthBlock + shapedBIRPText({
      behavior: parsed.behavior || birpBehavior,
      intervention: parsed.intervention || birpIntervention,
      response: parsed.response || birpResponse,
      plan: parsed.plan || birpPlan
    });

    return res.json({
      ok: true,
      id: uuidv4(),
      generatedNote: finalText,
      noteText: finalText,
      note: finalText
    });

  } catch (err) {
    console.error("[/api/birp-enhance] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;