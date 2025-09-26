'use strict';

// Reuse the same MODEL settings as server.js
const MODEL_API_URL = (process.env.MODEL_API_URL || 'http://localhost:11434/v1/chat/completions').trim();
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.1:8b';

async function callModel({ system, user, temperature = 0.2, model, maxTokens }) {
  const chosen = (model && String(model).trim()) || MODEL_NAME;
  const body = {
    model: chosen,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  };
  if (Number.isFinite(maxTokens)) body.max_tokens = maxTokens;

  const resp = await fetch(MODEL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const t = await resp.text().catch(()=> '');
    throw new Error(`Model API error ${resp.status}: ${t || resp.statusText}`);
  }
  const j = await resp.json();
  const text = j?.choices?.[0]?.message?.content ?? j?.choices?.[0]?.text ?? '';
  return (text || '').trim();
}

module.exports = { callModel };
