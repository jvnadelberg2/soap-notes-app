/* BEGIN:ARCH-COMMENT
File: public/actions-stable.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
/* /actions-stable.js */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function setStatus(msg) {
    const el = $("status");
    if (el) el.textContent = msg || "";
  }

  async function onGenerateClick(ev) {
    const btn = ev.currentTarget;
    try {
      btn.disabled = true;
      setStatus("Generating…");

      if (typeof window.generateStable !== "function") {
        console.error("[actions] window.generateStable is not defined");
        setStatus("Error: generator not loaded.");
        return;
      }

      // generateStable will internally call generateWithModel (POST) if enabled
      const note = await window.generateStable();

      // Show result (generateStable already writes to #soapTextOut; this is just safety)
      const pre = $("soapTextOut");
      if (pre && !pre.textContent) pre.textContent = note || "";

      setStatus("Done.");
    } catch (e) {
      console.error("[actions] generate failed", e);
      setStatus("Generation failed. See console for details.");
    } finally {
      btn.disabled = false;
    }
  }

  function ready() {
    try {
      const btnGenerate = $("btnGenerate");
      if (btnGenerate) {
        btnGenerate.removeEventListener("click", onGenerateClick);
        btnGenerate.addEventListener("click", onGenerateClick, { passive: true });
      } else {
        console.warn("[actions] #btnGenerate not found");
      }

      // Optional: keep these no-ops to avoid errors if other files removed/changed
      const noop = (id, fn) => {
        const el = $(id);
        if (el && fn) {
          el.onclick = (e) => {
            try { fn(e); } catch (err) { console.warn(`[actions] ${id} failed`, err); }
          };
        }
      };

      noop("btnClear", () => {
        // Keep existing clear logic elsewhere; just a small guard here
        const ids = ["chiefComplaint","hpi","pmh","fh","sh","ros","exam","diagnostics",
                     "vBP","vHR","vRR","vTemp","vWeight","vO2Sat"];
        ids.forEach((id) => { const el = $(id); if (el) el.value = ""; });
        setStatus("Cleared patient data.");
      });

      noop("genStream", () => window.print());
      // You likely have real handlers elsewhere for save/export; we leave them alone.
      noop("saveNote");
      noop("exportPdf");

      console.log("[actions] Generate button wired.");
    } catch (e) {
      console.error("[actions] init failed", e);
      setStatus("UI init error.");
    }
  }

  // Scripts load with defer; DOM is parsed by now, but guard anyway:
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  } else {
    ready();
  }
})();


// === Finalize wiring (added) ===
(function(){
  const $ = (id) => document.getElementById(id);

  function defaultSignedBy(){
    const prov = ($('provider')?.value || '').trim();
    const cred = ($('credentials')?.value || '').trim();
    return cred ? `${prov}, ${cred}` : prov;
  }
  function maybePrefillSignedBy(){
    const box = $('signedBy');
    if (!box) return;
    if (!box.value.trim()) box.value = defaultSignedBy();
  }
  document.addEventListener('DOMContentLoaded', maybePrefillSignedBy);
  ['provider','credentials'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', maybePrefillSignedBy);
    if (el) el.addEventListener('blur',   maybePrefillSignedBy);
  });

  const btn = $('btn-finalize');
  if (!btn) return;
  async function finalizeNow(e){
    e.preventDefault();
    try {
      btn.disabled = true;
      if (typeof window.saveNote === 'function') await window.saveNote();

      const uuid = ($('current-note-uuid')?.value || '').trim();
      if (!uuid) { alert('No current note to finalize.'); return; }

      const signedBy = ($('signedBy')?.value || defaultSignedBy()).trim();
      const attestationText = ($('attestationText')?.value || '').trim();

      const r = await fetch('/api/notes/' + encodeURIComponent(uuid) + '/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedBy, attestationText })
      });
      if (!r.ok){
        let code = '' + r.status;
        try { const j = await r.json(); if (j && j.error && j.error.code) code = j.error.code; } catch(_){}
        alert('Finalize failed: ' + code);
        return;
      }
      const j = await r.json();
      if ($('finalizedAt')) $('finalizedAt').value = j.note?.finalizedAt || new Date().toISOString();
      if (typeof window.refreshList === 'function') await window.refreshList();
      alert('Note finalized.');
    } catch (err) {
      console.error('Finalize failed', err);
      alert('Finalize failed.');
    } finally {
      btn.disabled = false;
    }
  }
  btn.addEventListener('click', finalizeNow, { passive:false });
})();
// === End Finalize wiring ===