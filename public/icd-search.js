// public/icd-search.js
(function () {
  const $ = (id) => document.getElementById(id);

  async function icdSearch(q, limit = 10) {
    const res = await fetch('/api/icd/search?q=' + encodeURIComponent(q) + '&limit=' + limit);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  function render(list) {
    const box = $('icd-box');
    if (!box) return;
    if (!list || !list.length) { box.value = ''; return; }
    box.value = list.map(r => `${r.code} — ${r.description}`).join('\n');
  }

  function wire() {
    const btn = $('searchIcdBtn');
    const input = $('icdSearch');
    const box = $('icd-box');
    if (!btn || !input || !box) return;
    if (btn.__wired) return; btn.__wired = true;

    btn.addEventListener('click', async () => {
      const q = (input.value || '').trim();
      if (!q) { box.value = ''; return; }
      btn.disabled = true;
      try { render(await icdSearch(q, 10)); }
      catch (e) { box.value = 'Search error: ' + e.message; }
      finally { btn.disabled = false; }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();

