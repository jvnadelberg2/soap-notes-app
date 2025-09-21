"use strict";

const express = require("express");
const router = express.Router();

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
 * POST /api/birp
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

module.exports = router;