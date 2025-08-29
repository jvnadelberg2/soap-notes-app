import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/models", async (req, res) => {
  try {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    const { data } = await axios.get(`${host}/api/tags`, { timeout: 4000 });
    const models = Array.isArray(data?.models) ? data.models.map(m => m.name) : [];
    res.json({ models });
  } catch {
    res.json({ models: [] });
  }
});

export default router;
