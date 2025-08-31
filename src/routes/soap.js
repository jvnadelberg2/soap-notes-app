import express from "express";
import { getSpecialtiesList } from "../utils/specLoader.js";
import { generateSoapNoteJSON, generateSoapNoteText } from "../services/ai.js";

const router = express.Router();

router.get("/specialties", (_req, res) => {
  res.json({ specialties: getSpecialtiesList() });
});

router.post("/generate-soap-json", async (req, res) => {
  try {
    const {
      rawText = "",
      patientHistory = "",
      specialty = "General Practice",
      vitals = {},
      labs = {},
      imaging = [],
      allowInference = false,
      model = null,
      provider = "ollama",
    } = req.body || {};

    const note = await generateSoapNoteJSON({
      rawText,
      patientHistory,
      specialty,
      vitals,
      labs,
      imaging,
      allowInference,
      model,
      provider,
    });

    res.json(note);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI generation failed" });
  }
});

router.post("/generate-soap", async (req, res) => {
  try {
    const {
      rawText = "",
      patientHistory = "",
      specialty = "General Practice",
      vitals = {},
      labs = {},
      imaging = [],
      allowInference = false,
      model = null,
      provider = "ollama",
    } = req.body || {};

    const text = await generateSoapNoteText({
      rawText,
      patientHistory,
      specialty,
      vitals,
      labs,
      imaging,
      allowInference,
      model,
      provider,
    });

    res.json({ soapNote: text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI generation failed" });
  }
});

export default router;
