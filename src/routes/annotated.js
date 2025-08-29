import express from "express";
import { generateSoapNoteJSON } from "../services/ai.js";
import { suggestICD } from "../services/icd.js";

const router = express.Router();

router.post("/generate-soap-json-annotated", async (req, res) => {
  try {
    const { rawText = "", patientHistory = "", specialty = "General Practice", vitals = null, labs = null, imaging = null, allowInference = false, limit = 8, model = null, provider = "ollama" } = req.body || {};
    const data = await generateSoapNoteJSON({ rawText, patientHistory, specialty, vitals, labs, imaging, allowInference, model, provider });
    const icd = suggestICD({ text: [data.Subjective, data.Objective, data.Assessment, data.Plan].join(" | "), limit });
    res.json({ data, icd, meta: { specialty, allowInference, model, provider } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Annotated generation failed" });
  }
});

export default router;
