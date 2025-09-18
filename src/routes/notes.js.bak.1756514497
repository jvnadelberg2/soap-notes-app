import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateSoapNoteJSON, generateSoapNoteText } from "../services/ai.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NOTES_DIR = path.resolve(__dirname, "../../notes");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function slug(s) {
  return String(s || "note").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "note";
}

router.get("/notes-list", (req, res) => {
  try {
    ensureDir(NOTES_DIR);
    const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith(".json")).sort().reverse();
    const rows = files.map(f => {
      try {
        const j = JSON.parse(fs.readFileSync(path.join(NOTES_DIR, f), "utf8"));
        return {
          id: j.id || f.replace(/\.json$/, ""),
          savedAt: j.savedAt,
          specialty: j.specialty,
          model: j.model,
          provider: j.provider || "ollama",
          json: `/notes/${f}`,
          text: `/notes/${f.replace(/\.json$/, ".txt")}`
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    res.json({ notes: rows });
  } catch {
    res.json({ notes: [] });
  }
});

router.post("/save-note", async (req, res) => {
  try {
    const {
      rawText = "",
      patientHistory = "",
      specialty = "General Practice",
      vitals = null,
      labs = null,
      imaging = null,
      allowInference = false,
      model = null,
      provider = "ollama",
      data = null
    } = req.body || {};

    ensureDir(NOTES_DIR);
    const base = `${ts()}_${slug(specialty)}`;
    const jsonPath = path.join(NOTES_DIR, `${base}.json`);
    const txtPath  = path.join(NOTES_DIR, `${base}.txt`);

    const soapJson = data && typeof data === "object"
      ? data
      : await generateSoapNoteJSON({ rawText, patientHistory, specialty, vitals, labs, imaging, allowInference, model, provider });

    const soapText = await generateSoapNoteText({ rawText, patientHistory, specialty, vitals, labs, imaging, allowInference, model, provider });

    const payload = {
      id: base,
      savedAt: new Date().toISOString(),
      specialty,
      model: model || process.env.OLLAMA_MODEL || "llama3",
      provider,
      allowInference: !!allowInference,
      input: { rawText, patientHistory, vitals, labs, imaging },
      soap: soapJson
    };

    fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
    fs.writeFileSync(txtPath, soapText);

    res.json({
      ok: true,
      id: base,
      files: {
        json: `/notes/${base}.json`,
        text: `/notes/${base}.txt`
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Save failed" });
  }
});

export default router;
