import axios from "axios";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEBUG = process.env.DEBUG_AI === "1";

export async function callLLM({ prompt, model = null, provider = "ollama" }) {
  if (provider === "openai" && OPENAI_KEY) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: OPENAI_KEY });
      const resp = await client.chat.completions.create({
        model: model || DEFAULT_OPENAI_MODEL,
        messages: [
          { role: "system", content: "You are a careful medical assistant. Output exactly what the user asks." },
          { role: "user", content: prompt }
        ],
        temperature: 0
      });
      const out = resp?.choices?.[0]?.message?.content || "";
      if (DEBUG) console.log("[OPENAI raw]", out.slice(0, 800));
      return out;
    } catch (e) {
      if (DEBUG) console.error("[OPENAI error]", e?.message || String(e));
      return "";
    }
  }
  try {
    const { data } = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      { model: model || DEFAULT_OLLAMA_MODEL, prompt, stream: false },
      { timeout: 120000 }
    );
    if (DEBUG) console.log("[OLLAMA raw]", (data?.response || "").slice(0, 800));
    return data?.response || "";
  } catch (e) {
    if (DEBUG) console.error("[OLLAMA error]", e?.message || String(e));
    return "";
  }
}
