import express from "express";
import axios from "axios";
const router = express.Router();
router.get("/models", async (req, res) => {
  const fallback = ["llama3:latest","llama3.1:8b","mistral:7b-instruct","phi3:mini"];
  try {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    const r = await axios.get(`${host}/api/tags`, { timeout: 3000 });
    const arr = Array.isArray(r?.data?.models) ? r.data.models.map(m => m.name).filter(Boolean) : [];
    const out = arr.length ? arr : (Array.isArray(req.app?.locals?.models) && req.app.locals.models.length ? req.app.locals.models : fallback);
    res.json({ ok:true, models: out });
  } catch {
    const out = (Array.isArray(req.app?.locals?.models) && req.app.locals.models.length) ? req.app.locals.models : fallback;
    res.json({ ok:true, models: out });
  }
});
export default router;
