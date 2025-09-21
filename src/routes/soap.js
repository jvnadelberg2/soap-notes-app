import express from "express";
let genJSON = null, genText = null;
try {
  const m = await import("../services/ai.js");
  genJSON = m.generateSoapNoteJSON;
  genText = m.generateSoapNoteText || null;
} catch {}

const router = express.Router();

function buildFallback({ rawText = "", patientHistory = "", specialty = "General Practice" }) {
  const subj = (rawText||"").trim() || "Not provided";
  const obj = "Not provided";
  const assess = "Further assessment required based on provided information only.";
  const plan = [
    "Further evaluation based on history and exam.",
    "Obtain/verify vital signs; address abnormalities.",
    "Consider baseline tests relevant to the complaint.",
    "Provide return/ED precautions."
  ].join("\n");
  return { Subjective: subj, Objective: obj, Assessment: assess, Plan: plan, Specialty: specialty };
}

router.post("/soap/json", async (req, res) => {
  try {
    const { rawText = "", patientHistory = "", specialty = "General Practice", vitals = null, labs = null, imaging = null, allowInference = false, model = null, provider = "ollama" } = req.body || {};
    let note;
    if (typeof genJSON === "function") {
      note = await genJSON({ rawText, patientHistory, specialty, vitals, labs, imaging, allowInference, model, provider });
      if (note && note.text && !note.Subjective) {
        note = buildFallback({ rawText, patientHistory, specialty });
      }
    } else {
      note = buildFallback({ rawText, patientHistory, specialty });
    }
    res.json({ ok: true, note });
  } catch (e) {
    try {
      const fb = buildFallback(req.body||{});
      res.json({ ok:true, note: fb });
    } catch (e2) {
      res.status(500).json({ ok:false, error: String(e2?.message||e2) });
    }
  }
});

router.post("/soap/text", async (req, res) => {
  try {
    const { rawText = "", patientHistory = "", specialty = "General Practice", vitals = null, labs = null, imaging = null, allowInference = false, model = null, provider = "ollama" } = req.body || {};
    if (typeof genText === "function") {
      const txt = await genText({ rawText, patientHistory, specialty, vitals, labs, imaging, allowInference, model, provider });
      res.set("Content-Type","text/plain; charset=utf-8").send(txt);
      return;
    }
    const n = buildFallback({ rawText, patientHistory, specialty });
    const s = ["Subjective","Objective","Assessment","Plan"].map(k => `**${k}:**\n\n${n[k]||""}`).join("\n\n");
    res.set("Content-Type","text/plain; charset=utf-8").send(s);
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e?.message||e) });
  }
});

export default router;
