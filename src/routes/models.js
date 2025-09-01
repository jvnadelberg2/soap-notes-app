import express from "express";
import axios from "axios";

const router = express.Router();

/**
 * Return true if the model name is an embedding model.
 * We exclude common embeddings (e.g., nomic-embed-text) and any tag containing "embed"/"embedding".
 */
function isEmbedding(name) {
  const n = String(name || "").toLowerCase();
  if (!n) return false;
  if (n.includes("nomic-embed-text")) return true;
  if (n.includes("embed")) return true;       // catches "embed" and "embedding"
  if (n.includes("embedding")) return true;
  return false;
}

/**
 * Normalize, filter, and deduplicate a list of model names.
 */
function sanitizeList(list) {
  const out = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach((x) => {
    const name = String(x || "").trim();
    if (!name) return;
    if (isEmbedding(name)) return;
    if (seen.has(name)) return;
    seen.add(name);
    out.push(name);
  });
  return out;
}

router.get("/models", async (req, res) => {
  const fallback = ["llama3:latest", "llama3.1:8b", "mistral:7b-instruct", "phi3:mini"];

  try {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    const r = await axios.get(`${host}/api/tags`, { timeout: 3000 });

    const arr = Array.isArray(r?.data?.models)
      ? r.data.models.map((m) => m && m.name).filter(Boolean)
      : [];

    let out = sanitizeList(arr);

    if (!out.length && Array.isArray(req.app?.locals?.models) && req.app.locals.models.length) {
      out = sanitizeList(req.app.locals.models);
    }
    if (!out.length) {
      out = sanitizeList(fallback);
    }

    res.json({ ok: true, models: out });
  } catch (_e) {
    const local = Array.isArray(req.app?.locals?.models) ? req.app.locals.models : [];
    const out = sanitizeList(local.length ? local : fallback);
    res.json({ ok: true, models: out });
  }
});

export default router;

