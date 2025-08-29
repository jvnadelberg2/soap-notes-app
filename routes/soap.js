import express from "express";
import { generateSoapNote } from "../services/ai.js";

const router = express.Router();

// Generate SOAP notes with specialty-awareness
router.post("/generate-soap", async (req, res) => {
  try {
    const { rawText, patientHistory, specialty } = req.body;

    const soapNote = await generateSoapNote(rawText, patientHistory, specialty);
    res.json({ soapNote });
  } catch (err) {
    console.error("AI Generation Failed:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

export default router;

