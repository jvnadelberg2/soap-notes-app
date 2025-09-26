"use strict";

const express = require("express");
const router = express.Router();
const { runModel } = require("../services/ai");  // make sure this path is correct

/**
 * Build a simple BIRP note string
 */
function formatBirpNote(body) {
  let note = "BIRP Note\n\n";

  if (body.birpBehavior) note += "Behavior:\n" + body.birpBehavior + "\n\n";
  if (body.birpIntervention) note += "Intervention:\n" + body.birpIntervention + "\n\n";
  if (body.birpResponse) note += "Response:\n" + body.birpResponse + "\n\n";
  if (body.birpPlan) note += "Plan:\n" + body.birpPlan + "\n\n";

  return note.trim();
}

/**
 * POST /api/birp  (raw stitched note, no AI)
 */
router.post("/api/birp", async (req, res) => {
  try {
    const body = req.body || {};
    console.log("[BIRP] Received payload keys:", Object.keys(body));

    const text = formatBirpNote(body);
    return res.json({ ok: true, text });
  } catch (err) {
    console.error("[BIRP] ❌ Error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/birp-enhance  (AI-assisted)
 */
router.post("/api/birp-enhance", async (req, res) => {
  try {
    const {
      birpBehavior,
      birpIntervention,
      birpResponse,
      birpPlan,
      model,
      assistLevel
    } = req.body;

    const level = Number(assistLevel);
    console.log("[BIRP] Assist level:", assistLevel, "parsed:", level);

    let instruction = "";
    switch (level) {
      case 0:
        return res.json({
          generatedNote: formatBirpNote({
            birpBehavior,
            birpIntervention,
            birpResponse,
            birpPlan
          })
        });
      case 1:
        instruction = "Write a one-sentence introductory suggestion for this BIRP note.";
        break;
      case 2:
        instruction = "Write a couple of sentences to refine and improve this BIRP note.";
        break;
      case 3:
        instruction = "Rewrite into a short structured BIRP draft (concise and clear).";
        break;
      case 4:
        instruction = "Rewrite each section into a full paragraph with professional clinical language.";
        break;
      case 5:
        instruction = "Generate a comprehensive BIRP note draft with detailed clinical language.";
        break;
      default:
        instruction = "Provide a concise clinical improvement of this BIRP note.";
    }

    const prompt = `
${instruction}

Behavior: ${birpBehavior}
Intervention: ${birpIntervention}
Response: ${birpResponse}
Plan: ${birpPlan}
    `;

    const output = await runModel({ model, prompt, max_tokens: 800 });
    return res.json({ generatedNote: output });

  } catch (err) {
    console.error("[BIRP] ❌ Enhance error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;