import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import modelsRouter from "./src/routes/models.js";
import exportRouter from "./src/routes/export.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "2mb" }));

async function ollamaGenerate(model, prompt) {
  const r = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false })
  });
  if (!r.ok) throw new Error("ollama " + r.status);
  const j = await r.json();
  return String(j && j.response ? j.response : "");
}

function kvLines(obj) {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj).map(k => `${k}: ${obj[k]}`);
}

app.post("/api/soap/text", async (req, res) => {
  try {
    const b = req.body || {};
    const model = String(b.model || "llama3:latest");
    const strict = !!b.strict;
    const specialty = String(b.specialty || "General Practice");
    const hpi = String(b.rawText || "").trim();
    const history = String(b.patientHistory || "").trim();
    const dob = String(b.dob || "").trim();
    const sex = String(b.sex || "").trim();
    const duration = String(b.duration || "").trim();
    const vitals = b.vitals || {};
    const labs = b.labs || {};
    const imaging = Array.isArray(b.imaging) ? b.imaging : [];

    const subj = [hpi, history].filter(Boolean).join("\n\n");

    const demo = [];
    if (dob) demo.push(`DOB: ${dob}`);
    if (sex) demo.push(`Sex: ${sex}`);
    if (duration) demo.push(`Duration: ${duration}`);

    const objLines = []
      .concat(demo)
      .concat(kvLines(vitals))
      .concat(kvLines(labs))
      .concat(imaging.map(x => `Imaging: ${x}`));
    const objText = objLines.join("\n") || "N/A";

    const sys = strict
      ? "You are a clinical assistant. Be concise and literal. Do not invent facts. Use professional tone."
      : "You are a clinical assistant.";

    const prompt =
      sys +
      "\n\n" +
      `Specialty: ${specialty}\n\n` +
      "Subjective (context):\n" +
      (subj || "N/A") +
      "\n\n" +
      "Objective (context):\n" +
      objText +
      "\n\n" +
      "Task:\n" +
      "Based on the context above, write ONLY the following SOAP sections:\n" +
      "Assessment:\n" +
      "<concise assessment>\n\n" +
      "Plan:\n" +
      "<concise plan>\n\n" +
      "Do not restate Subjective or Objective. Use clear medical language.";

    const text = await ollamaGenerate(model, prompt);
    res.setHeader("X-Model-Used", model);
    res.type("text/plain").send(text);
  } catch (e) {
    res.setHeader("X-Model-Used", String((req.body && req.body.model) || ""));
    res.status(500).type("text/plain").send("Assessment:\n\nPlan:\n");
  }
});

app.use("/api", modelsRouter);
app.use("/api", exportRouter);

const publicDir = path.resolve(__dirname, "public");
const notesDir = path.resolve(__dirname, "notes");

app.use(express.static(publicDir));
app.use("/notes", express.static(notesDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

