import express from "express";

const router = express.Router();

router.get("/providers", async (req, res) => {
  const providers = ["ollama"];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  const openaiModels = (process.env.OPENAI_MODELS || "").split(",").map(s => s.trim()).filter(Boolean);
  const defaults = {
    ollamaModel: process.env.OLLAMA_MODEL || "llama3",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini"
  };
  res.json({ providers, openaiModels, defaults });
});

export default router;
