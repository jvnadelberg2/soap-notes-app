import express from "express";
import { generateSoapNoteJSON } from "../services/ai.js";
import { findBestICD } from "../services/icd.js";

const router = express.Router();

router.post("/generate-soap-json-annotated", async (req,res) => {
  try{
    const {
      rawText = "",
      patientHistory = "",
      specialty = "General Practice",
      vitals = {},
      labs = {},
      imaging = [],
      allowInference = false,
      model = null,
      provider = "ollama"
    } = req.body || {};

    const data = await generateSoapNoteJSON({
      rawText,
      patientHistory,
      specialty,
      vitals,
      labs,
      imaging,
      allowInference,
      model,
      provider
    });

    const assessmentOnly =
      (typeof data?.assessment === "string" ? data.assessment : "") ||
      (typeof data?.assessment?.text === "string" ? data.assessment.text : "") ||
      (typeof data?.Assessment === "string" ? data.Assessment : "") ||
      (typeof data?.Assessment?.text === "string" ? data.Assessment.text : "") ||
      "";

    const icd = findBestICD({ text: assessmentOnly, limit: 12 }) || [];

    res.json({ data, icd });
  }catch(e){
    res.status(500).json({ error: String((e&&e.message)||e) });
  }
});

export default router;
