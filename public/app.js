'use strict';

// Minimal client boot: populate model list only. No Generate handler here.

function byId(id) { return document.getElementById(id); }

async function loadModels() {
  const sel = byId('model');
  if (!sel) return;
  try {
    const res = await fetch('/api/models', { headers: { 'accept': 'application/json' } });
    if (!res.ok) return;

    const data = await res.json();
    const list = Array.isArray(data) ? data : (Array.isArray(data.models) ? data.models : []);

    // Reset options
    sel.innerHTML = '';
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '';
    sel.appendChild(empty);

    for (const item of list) {
      const name = (item && (item.id || item.name)) ? (item.id || item.name) : String(item ?? '');
      if (!name) continue;
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    }
  } catch {
    // ignore
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadModels();
  // Intentionally do NOT attach any click handler to #btnGenerate here.
  // The only code that should handle generation is in generate-stable.js.
});
