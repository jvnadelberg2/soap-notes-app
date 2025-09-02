import express from "express";
import { suggestICD, writeICDIndex, buildIndexFromSimpleCSV, loadIndex } from "../services/icd.js";

const router = express.Router();

router.post("/icd-suggest", (req, res) => {
  const { text = "", limit = 8 } = req.body || {};
  res.json({ icd: suggestICD({ text, limit }) });
});

router.get("/icd-count", (req, res) => {
  const idx = loadIndex();
  res.json({ count: idx.length });
});

router.post("/icd-import-csv", (req, res) => {
  try{
    const { csv = "", mode = "replace" } = req.body || {};
    const entries = buildIndexFromSimpleCSV(csv);
    if (!entries.length) return res.status(400).json({ error: "No valid rows" });

    if (mode === "append"){
      const current = loadIndex();
      const seen = new Set(current.map(e => e.code));
      const merged = [...current];
      for (const e of entries) if (!seen.has(e.code)) merged.push(e);
      writeICDIndex(merged);
      return res.json({ ok: true, mode: "append", added: entries.length, total: merged.length });
    } else {
      writeICDIndex(entries);
      return res.json({ ok: true, mode: "replace", total: entries.length });
    }
  } catch (e){
    return res.status(500).json({ error: "Import failed" });
  }
});

export default router;
