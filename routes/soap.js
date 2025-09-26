/* BEGIN:ARCH-COMMENT
File: routes/soap.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: POST /generate-soap
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
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

