// services/icd.js
const fs = require("fs");
const path = require("path");
const Fuse = require("fuse.js");

let fuse = null;

function loadICD(csvPath) {
  try {
    const full = fs.readFileSync(csvPath, "utf8");
    const lines = full.split(/\r?\n/).filter(Boolean);

    const records = lines.map(line => {
      const [code, description] = line.split(",", 2);
      return { code: code.trim(), description: (description || "").trim() };
    });

    fuse = new Fuse(records, {
      keys: ["code", "description"],
      includeScore: true,
      threshold: 0.3,   // lower = stricter
      ignoreLocation: true,
    });

    console.log(`[ICD] Loaded ${records.length} ICD-10 codes`);
  } catch (err) {
    console.error("[ICD] Failed to load codes:", err);
  }
}

function suggestICD(text, limit = 5) {
  if (!fuse) return [];
  if (!text || !text.trim()) return [];
  const results = fuse.search(text, { limit });
  return results.map(r => r.item);
}

module.exports = { loadICD, suggestICD };