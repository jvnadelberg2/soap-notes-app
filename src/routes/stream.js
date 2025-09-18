import express from "express";
import { getSpecialtyConfig } from "../utils/specLoader.js";

const router = express.Router();

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3";

function s(x) {
  if (!x) return "Not provided";
  if (Array.isArray(x)) return x.length ? JSON.stringify(x) : "Not provided";
  if (typeof x === "object") return Object.keys(x).length ? JSON.stringify(x) : "Not provided";
  return String(x);
}

function buildTextPrompt({ rawText, patientHistory, specialty, complexity, instructions, vitals, labs, imaging, allowInference }) {
  const rule = allowInference
    ? 'You may add cautious differentials prefixed with "Consider ..." based only on provided info. Do not invent vitals, labs, imaging, ECG, or exam findings.'
    : 'Do not speculate. If data is missing, write "Not provided". Do not fabricate vitals, labs, imaging, ECG, or exam findings.';
  return `You are an AI medical assistant for ${specialty} (complexity: ${complexity}).
Rules:
- ${rule}
- Output as strict plaintext in this order and headings exactly:
Subjective:
Objective:
Assessment:
Plan:

Instructions:
${instructions}

Patient History:
${patientHistory || "Not provided"}

Current Visit Notes:
${rawText || "Not provided"}

Vitals (use exactly as given):
${s(vitals)}

Labs (use exactly as given):
${s(labs)}

Imaging (use exactly as given):
${s(imaging)}
`;
}

router.post("/generate-soap-stream", async (req, res) => {
  try {
    const { rawText = "", patientHistory = "", specialty = "General Practice", vitals = null, labs = null, imaging = null, allowInference = false, model = null } = req.body || {};
    const spec = getSpecialtyConfig(specialty) || { complexity: "medium", instructions: "Use standard SOAP formatting." };
    const prompt = buildTextPrompt({ rawText, patientHistory, specialty, complexity: spec.complexity, instructions: spec.instructions, vitals, labs, imaging, allowInference });
    const mdl = model || DEFAULT_MODEL;

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const r = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: mdl, prompt, stream: true })
    });

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.response) res.write(obj.response);
          if (obj.done) break;
        } catch {}
      }
    }
    if (buffer.trim()) {
      try {
        const obj = JSON.parse(buffer);
        if (obj.response) res.write(obj.response);
      } catch {}
    }
    res.end();
  } catch (e) {
    res.status(500).end("Streaming failed");
  }
});

export default router;
