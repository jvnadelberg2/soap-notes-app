import Ajv from "ajv";
import { getSpecialtyConfig } from "../utils/specLoader.js";
import { soapSchema } from "../utils/soapSchema.js";
import { enrichObjective, normalizeSOAP } from "../utils/postprocess.js";
import { buildConservativePlan } from "../utils/planFallback.js";
import { callLLM } from "./llm.js";

const DEBUG = process.env.DEBUG_AI === "1";
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(soapSchema);

function s(x) {
  if (!x) return "Not provided";
  if (Array.isArray(x)) return x.length ? JSON.stringify(x) : "Not provided";
  if (typeof x === "object") return Object.keys(x).length ? JSON.stringify(x) : "Not provided";
  return String(x);
}

function buildPrompt({ rawText, patientHistory, specialty, complexity, instructions, vitals, labs, imaging, allowInference }) {
  const inferenceRule = allowInference
    ? 'You may propose cautious differentials or plans explicitly labeled with "Consider ..." based on provided info only. Do not invent vitals, labs, imaging, ECG, or exam findings.'
    : 'Do not speculate. If data is missing, write "Not provided". Do not fabricate vitals, labs, imaging, ECG, or exam findings.';
  return `You are an AI medical assistant for ${specialty} (complexity: ${complexity}).
Rules:
- ${inferenceRule}
- Fill every field; use "Not provided" only when truly missing.
- Keep content specialty-appropriate and concise.

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

Return ONLY valid minified JSON with exactly these keys and no extras:
{"Subjective":"","Objective":"","Assessment":"","Plan":""}`;
}

function extractFirstJson(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try { return JSON.parse(candidate); } catch {}
      }
    }
  }
  return null;
}

function heuristicFill(obj, { rawText, patientHistory, specialty }) {
  const out = { ...obj };
  const rt = (rawText || "").trim();
  if ((!out.Subjective || /^not provided$/i.test(out.Subjective)) && rt) out.Subjective = rt;
  const ph = (patientHistory || "").toLowerCase();
  if (!out.Assessment || /^not provided$/i.test(out.Assessment)) {
    const risks = [];
    if (/htn|hypertension/.test(ph)) risks.push("hypertension");
    if (/smok/.test(ph)) risks.push("smoking");
    if (/mi|myocardial infarction|heart attack/.test(ph)) risks.push("family history of MI");
    const riskStr = risks.length ? `Risk factors: ${risks.join(", ")}.` : "";
    out.Assessment = [riskStr, "Further assessment required based on provided information only."].filter(Boolean).join(" ");
  }
  if (!out.Plan || /^not provided$/i.test(out.Plan)) {
    out.Plan = buildConservativePlan({ specialty });
  }
  return out;
}

export async function generateSoapNoteJSON({ rawText, patientHistory, specialty, vitals, labs, imaging, allowInference = false, model = null, provider = "ollama" }) {
  const spec = getSpecialtyConfig(specialty) || { complexity: "medium", instructions: "Use general SOAP formatting." };
  const prompt = buildPrompt({ rawText, patientHistory, specialty, complexity: spec.complexity, instructions: spec.instructions, vitals, labs, imaging, allowInference });
  const out = await callLLM({ prompt, model, provider });

  let obj = extractFirstJson(out);
  if (!obj) { try { obj = JSON.parse((out || "").trim()); } catch {} }

  if (!obj || !validate(obj)) {
    const repairText = await callLLM({
      prompt: `Repair to valid minified JSON with keys Subjective,Objective,Assessment,Plan only. No extra keys. Content:\n${out}`,
      model,
      provider
    });
    obj = extractFirstJson(repairText) || (() => { try { return JSON.parse((repairText || "").trim()); } catch { return null; } })();
  }

  if (!obj || !validate(obj)) {
    obj = { Subjective: "Not provided", Objective: "Not provided", Assessment: "Not provided", Plan: "Not provided" };
  }

  obj.Objective = enrichObjective(obj, { vitals, labs, imaging });
  obj = normalizeSOAP(obj);
  obj = heuristicFill(obj, { rawText, patientHistory, specialty });

  return obj;
}

export async function generateSoapNoteText(args) {
  const json = await generateSoapNoteJSON(args);
  return `Subjective:\n${json.Subjective}\n\nObjective:\n${json.Objective}\n\nAssessment:\n${json.Assessment}\n\nPlan:\n${json.Plan}\n`;
}
