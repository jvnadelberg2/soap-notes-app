mkdir -p src/services src/routes

cat > src/services/icd.js <<'EOT'
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let TABLE = null;

function findIcdFile() {
  const direct = [
    ["public","icd10cm-codes-2026.txt"],
    ["public","icd10cm.txt"],
    ["data","icd10cm-codes-2026.txt"],
    ["data","icd10cm.txt"],
    ["data","icd10cm_2026","icd10cm-codes-2026.txt"],
    ["data","tmp","icd2026","icd10cm-codes-2026.txt"]
  ];
  for (const parts of direct) {
    const p = path.join(__dirname, "..", "..", ...parts);
    if (fs.existsSync(p)) return p;
  }
  const roots = [path.join(__dirname,"..","..","public"), path.join(__dirname,"..","..","data")];
  const stack = [...roots.filter(fs.existsSync)];
  while (stack.length) {
    const dir = stack.pop();
    const ents = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of ents) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (/icd.*codes.*\.txt$/i.test(ent.name) || /^icd.*\.txt$/i.test(ent.name)) return p;
    }
  }
  return null;
}

function parseLine(line) {
  const m = line.match(/^\s*([A-TV-Z][0-9A-Z]{2,7}(?:\.[0-9A-Z]{1,4})?)\s+(.+?)\s*$/);
  if (!m) return null;
  return { code: m[1].toUpperCase(), term: m[2] };
}

function loadTable() {
  if (TABLE) return TABLE;
  const file = findIcdFile();
  const map = Object.create(null);
  if (file && fs.existsSync(file)) {
    const txt = fs.readFileSync(file, "utf8");
    for (const line of txt.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const row = parseLine(line);
      if (row && !map[row.code]) map[row.code] = row.term;
    }
  }
  TABLE = map;
  return TABLE;
}

export function lookupICD(code) {
  const T = loadTable();
  const c = String(code || "").toUpperCase().trim();
  return c ? (T[c] || null) : null;
}

function tokens(s){ return String(s||"").toLowerCase().match(/[a-z0-9]+/g) || [] }

export function findBestICD({ text, limit = 10 }) {
  const T = loadTable();
  const q = tokens(text);
  if (!q.length) return [];
  const out = [];
  for (const [code, term] of Object.entries(T)) {
    const c = code.toLowerCase();
    const d = term.toLowerCase();
    let score = 0;
    for (const t of q) {
      if (c === t) score += 100;
      else if (c.startsWith(t)) score += 50;
      if (d.includes(t)) score += 10;
    }
    if (score > 0) out.push({ code, term, score });
  }
  out.sort((a,b)=>b.score-a.score);
  return out.slice(0, Math.max(1, Math.min(200, parseInt(limit,10)||10)));
}
EOT

cat > src/routes/icd.js <<'EOT'
import express from "express";
import { lookupICD, findBestICD } from "../services/icd.js";

const router = express.Router();

router.get("/icd-lookup", (req,res) => {
  const code = String(req.query.code || "").trim();
  if (!code) return res.status(400).json({ error: "code required" });
  const term = lookupICD(code);
  if (!term) return res.status(404).json({ error: "not found" });
  res.json({ code, term });
});

router.post("/icd-best", (req,res) => {
  const text = String((req.body && (req.body.text || req.body.query || "")) || "").trim();
  const limit = Math.max(1, Math.min(200, parseInt((req.body && req.body.limit) ?? "12", 10)));
  const icd = findBestICD({ text, limit }) || [];
  res.json({ icd, total: icd.length });
});

export default router;
EOT

cat > src/routes/annotated.js <<'EOT'
import express from "express";
import { generateSoapNoteJSON } from "../services/ai.js";
import { findBestICD } from "../services/icd.js";

const router = express.Router();

router.post("/generate-soap-json-annotated", async (req,res) => {
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

    const data = await generateSoapNoteJSON({
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

    const textForICD = [rawText, patientHistory].join(" ").trim();
    const icd = findBestICD({ text: textForICD, limit: 12 }) || [];

    res.json({ data, icd });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
});

export default router;
EOT

lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
