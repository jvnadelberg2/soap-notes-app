"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const Fuse = require("fuse.js");

const router = express.Router();

// Load ICD codes once into memory
const ICD_FILE = path.join(process.cwd(), "data", "icd10cm-codes-2026-categorized.txt");
let codes = [];

function loadCodes() {
  if (!fs.existsSync(ICD_FILE)) {
    console.error("[ICD] File not found:", ICD_FILE);
    return;
  }
  const lines = fs.readFileSync(ICD_FILE, "utf8").split(/\r?\n/);
  codes = lines
    .map((line) => {
      const [code, description, category] = line.split("\t");
      if (!code || !description) return null;
      return {
        code: code.trim(),
        description: description.trim(),
        category: category ? category.trim() : "Uncategorized",
      };
    })
    .filter(Boolean);
  console.log(`[ICD] Loaded ${codes.length} codes, sample:`, codes.slice(0, 3));
}
loadCodes();

// Fuse.js index
// Fuse.js index
let fuse = null;
function buildIndex() {
  fuse = new Fuse(codes, {
    includeScore: true,
    threshold: 0.2,
    ignoreLocation: true,   // don't penalize position in string
    minMatchCharLength: 5,  // require at least 5 chars
    keys: [
      { name: "code", weight: 0.7 },
      { name: "description", weight: 0.3 }
    ]
  });
}
buildIndex();

/* -------------------- Search Endpoint -------------------- */
router.get("/search", (req, res) => {
  const q = (req.query.q || "").trim();
  const limit = Math.min(Number(req.query.limit) || 50, 500);

  if (!q) return res.json({ results: [] });
  if (!fuse) buildIndex();

  const hits = fuse.search(q, { limit });
  const results = hits
    .sort((a, b) => a.score - b.score) // best matches first
    .map((h) => h.item);

  res.json({ results });
});

module.exports = router;