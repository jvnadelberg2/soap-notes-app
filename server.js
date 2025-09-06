// server.js  (CommonJS)
// Start with: PORT=5050 node server.js

const path = require("path");
const fs = require("fs");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 5050;

const MODEL_API_URL = process.env.MODEL_API_URL || "http://localhost:11434/v1/chat/completions";
const MODEL_NAME = process.env.MODEL_NAME || "llama3.1:8b";

app.use(express.json({ limit: "1mb" }));

// ---------- static ----------
const publicDir = path.join(process.cwd(), "public");
app.use(express.static(publicDir));
console.log("[STATIC ROOT]", publicDir);

app.get("/health", (req, res) => {
  const indexExists = fs.existsSync(path.join(publicDir, "index.html"));
  res.json({ ok: true, publicDir, indexExists, modelApi: MODEL_API_URL, modelName: MODEL_NAME });
});

// ---------- models (Ollama) ----------
app.get("/api/models", async (req, res) => {
  try {
    const r = await fetch("http://localhost:11434/api/tags");
    if (r.ok) {
      const data = await r.json();
      const names = (data.models || []).map(m => m.name).filter(Boolean);
      if (names.length) return res.json(names);
    }
  } catch {}
  res.json([MODEL_NAME, "llama3.2:3b", "llama3:70b", "mistral:7b", "qwen2:7b", "phi3:mini"]);
});

// ---------- model helper ----------
async function callModel({ system, user, temperature = 0.2 }) {
  const body = { model: MODEL_NAME, temperature, messages: [{ role: "system", content: system }, { role: "user", content: user }] };
  const resp = await fetch(MODEL_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Model API error ${resp.status}: ${t || resp.statusText}`);
  }
  const j = await resp.json();
  const text = j?.choices?.[0]?.message?.content ?? "";
  return (text || "").trim();
}

function s(x) { return (x ?? "").toString().trim(); }
function normalizeNone(txt) {
  const t = (txt || "").trim();
  if (!t) return "None provided.";
  if (/^none provided\b/i.test(t)) return "None provided.";
  if (/^none\b/i.test(t)) return "None provided.";
  if (/due to lack of information/i.test(t)) return "None provided.";
  return t;
}

// ---------- SOAP helpers ----------
function computeSubjective(body) {
  const cc  = s(body.chiefComplaint);
  const hpi = s(body.hpi);
  const pmh = s(body.pmh);
  const fh  = s(body.fh);
  const sh  = s(body.sh);
  const ros = s(body.ros);

  const parts = [];
  if (cc)  parts.push(`Chief Complaint: ${cc}`);
  if (hpi) parts.push(`HPI: ${hpi}`);
  if (pmh) parts.push(`PMH: ${pmh}`);
  if (fh)  parts.push(`FH: ${fh}`);
  if (sh)  parts.push(`SH: ${sh}`);
  if (ros) parts.push(`ROS: ${ros}`);

  return parts.length ? parts.join("\n") : "None provided.";
}

function computeObjective(body) {
  const vBP = s(body.vBP);
  const vHR = s(body.vHR);
  const vRR = s(body.vRR);
  const vTemp = s(body.vTemp);
  const vWeight = s(body.vWeight);
  const vO2Sat = s(body.vO2Sat);
  const diag = s(body.diagnostics);
  const exam = s(body.exam);

  const haveVitals = vBP || vHR || vRR || vTemp || vWeight || vO2Sat;
  const parts = [];

  if (haveVitals) {
    parts.push(`BP: ${vBP || "—"}, HR: ${vHR || "—"}, RR: ${vRR || "—"}, Temp: ${vTemp || "—"}, Weight: ${vWeight || "—"}, O2 Sat: ${vO2Sat || "—"}`);
  }
  if (diag) parts.push(`Diagnostics: ${diag}`);
  if (exam) parts.push(`Exam: ${exam}`);

  return parts.length ? parts.join("\n") : "None provided.";
}

function hasAnyClinicalInput(body) {
  const subj = computeSubjective(body);
  const obj = computeObjective(body);
  const anyS = subj && subj !== "None provided.";
  const anyO = obj && obj !== "None provided.";
  return anyS || anyO;
}

// Parse model SOAP text into sections in case it adds extra labeling/formatting.
function parseSOAPSections(text) {
  const T = (text || "").replace(/\r\n/g, "\n");
  const heads = ["Subjective", "Objective", "Assessment", "Plan"];
  const out = {};
  for (const name of heads) {
    const pattern = new RegExp(
      String.raw`(?:^|\n)\s*(?:\*\*)?\s*${name}\s*(?:\*\*)?\s*:?\s*\n?` +
      String.raw`([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*)?\s*(?:Subjective|Objective|Assessment|Plan)\s*(?:\*\*)?\s*:?\s*\n?|$)`,
      "i"
    );
    const m = T.match(pattern);
    if (m) out[name.toLowerCase()] = m[1].trim();
  }
  return out;
}

function shapeSOAP({ subj, obj, assess, plan }) {
  return `Subjective
${normalizeNone(subj)}

Objective
${normalizeNone(obj)}

Assessment
${normalizeNone(assess)}

Plan
${normalizeNone(plan)}`;
}

// ---------- SOAP handler ----------
async function handleSoap(req, res) {
  try {
    const useInference = !!req.body?.useInference;

    // Always compute S and O from *user inputs only* (never from model).
    const subj = computeSubjective(req.body || {});
    const obj  = computeObjective(req.body || {});
    const anyInput = hasAnyClinicalInput(req.body || {});

    if (!useInference) {
      const finalText = shapeSOAP({ subj, obj, assess: "None provided.", plan: "None provided." });
      return res.json({ ok: true, text: finalText, noteText: finalText, note: finalText });
    }

    // Use model only to propose Assessment/Plan when there's some input.
    let assess = "None provided.";
    let plan   = "None provided.";

    if (anyInput) {
      const system =
        "You are a clinical documentation assistant. Based ONLY on the provided Subjective and Objective text, " +
        "write Assessment and Plan. Do not invent data. If insufficient information, return 'None provided.' " +
        "Return plain text with the two headings: Assessment, Plan. No markdown.";

      const user =
`Subjective:
${subj}

Objective:
${obj}

Write Assessment and Plan only.`;

      const modelText = await callModel({ system, user, temperature: 0.1 });
      const parsed = parseSOAPSections(modelText || "");

      // Model might include S/O again; ignore those. We only care about A/P.
      assess = parsed.assessment || modelText; // fallback if model returned only Assessment text without heading
      plan   = parsed.plan || "";

      // If modelText didn't include headings, try to split on a simple heuristic.
      if (!parsed.assessment && !parsed.plan) {
        const split = (modelText || "").split(/\n\s*Plan\s*:?\s*\n/i);
        if (split.length === 2) {
          assess = split[0].replace(/^\s*Assessment\s*:?\s*\n?/i, "").trim();
          plan = split[1].trim();
        }
      }

      assess = normalizeNone(assess || "");
      plan   = normalizeNone(plan || "");
    }

    const finalText = shapeSOAP({ subj, obj, assess, plan });
    return res.json({ ok: true, text: finalText, noteText: finalText, note: finalText });
  } catch (e) {
    console.error("SOAP generation error:", e);
    res.status(500).json({ ok: false, error: "Error generating SOAP note." });
  }
}

app.post("/api/generate-soap-json-annotated", handleSoap);
app.post("/api/generate_soap", handleSoap);
app.post("/api/soap", handleSoap);

// ---------- BIRP (unchanged from last good version) ----------
function pick(body, keys) {
  for (const k of keys) {
    const v = body?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}
function normalizeBIRP(body) {
  const behavior = pick(body, ["birpBehavior", "behavior", "observation", "birpObservation", "birp_behavior"]);
  const intervention = pick(body, ["birpIntervention", "intervention", "birp_intervention"]);
  const response = pick(body, ["birpResponse", "response", "birp_response"]);
  const plan = pick(body, ["birpPlan", "plan", "birp_plan", "treatmentPlan", "birpPlanText"]);
  return { behavior, intervention, response, plan };
}
function parseBIRPSections(text) {
  const T = (text || "").replace(/\r\n/g, "\n");
  const names = ["Behavior", "Intervention", "Response", "Plan"];
  const out = {};
  for (const name of names) {
    const pattern = new RegExp(
      String.raw`(?:^|\n)\s*(?:\*\*)?\s*${name}\s*(?:\*\*)?\s*:?\s*\n?` +
      String.raw`([\s\S]*?)(?=(?:^|\n)\s*(?:\*\*)?\s*(?:Behavior|Intervention|Response|Plan)\s*(?:\*\*)?\s*:?\s*\n?|$)`,
      "i"
    );
    const m = T.match(pattern);
    if (m) out[name.toLowerCase()] = m[1].trim();
  }
  return out;
}
function shapedBIRPText({ behavior, intervention, response, plan }) {
  const B = normalizeNone(behavior);
  const I = normalizeNone(intervention);
  const R = normalizeNone(response);
  const P = normalizeNone(plan);
  return `Behavior
${B}

Intervention
${I}

Response
${R}

Plan
${P}`;
}
async function handleBIRP(req, res) {
  try {
    const useInference = !!req.body?.useInference;
    const fields = normalizeBIRP(req.body || {});
    const userShaped = shapedBIRPText(fields);

    if (!useInference) {
      return res.json({ ok: true, text: userShaped, noteText: userShaped, note: userShaped, ...fields });
    }

    const system =
      "You are a clinical documentation assistant. Produce a BIRP note with the sections Behavior, Intervention, Response, Plan. " +
      "Use ONLY details provided; if a section is missing, output 'None provided.' Return plain text with those four headings. " +
      "Do not include markdown, bold text, or a title.";

    const user =
`Behavior: ${fields.behavior || "None provided."}
Intervention: ${fields.intervention || "None provided."}
Response: ${fields.response || "None provided."}
Plan: ${fields.plan || "None provided."}

Output as plain text with exactly the four headings above. No extra text.`;

    let modelText = await callModel({ system, user, temperature: 0.1 });
    const parsed = parseBIRPSections(modelText || "");

    const merged = {
      behavior: fields.behavior || parsed.behavior || "",
      intervention: fields.intervention || parsed.intervention || "",
      response: fields.response || parsed.response || "",
      plan: fields.plan || parsed.plan || "",
    };

    const finalText = shapedBIRPText(merged);
    return res.json({ ok: true, text: finalText, noteText: finalText, note: finalText, ...merged });
  } catch (e) {
    console.error("BIRP generation error:", e);
    res.status(500).json({ ok: false, error: "Error generating BIRP note." });
  }
}
["/api/generate-birp-json-annotated", "/api/generate-birp", "/api/birp"].forEach(p => app.post(p, handleBIRP));

// ---------- root ----------
app.get("/", (req, res) => {
  const indexPath = path.join(publicDir, "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send("index.html not found");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
