import express from "express";
import fs from "fs";
import axios from "axios";

const router = express.Router();

router.get("/health", async (req, res) => {
  const out = { ok: true, port: process.env.PORT || 5000, checks: {} };
  try {
    out.checks.specialtiesJsonExists = fs.existsSync("data/specialties.json");
  } catch {
    out.checks.specialtiesJsonExists = false;
  }
  try {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    const { data } = await axios.get(`${host}/api/tags`, { timeout: 4000 });
    out.checks.ollama = true;
    out.checks.models = Array.isArray(data?.models) ? data.models.map(m => m.name) : [];
  } catch {
    out.checks.ollama = false;
    out.checks.models = [];
    out.ok = false;
  }
  res.json(out);
});

export default router;
