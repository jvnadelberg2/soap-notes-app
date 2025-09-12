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
    const s = $("status");
    if (s) s.textContent = String(msg || "");
  }

  function defaultSignedBy() {
    const provider = $("provider")?.value || "";
    const cred = $("credentials")?.value || "";
    return (provider + (cred ? " " + cred : "")).trim();
  }

  async function onGenerateClick(e) {
    try {
      if (e && e.preventDefault) e.preventDefault();
      const btn = $("btnGenerate");
      if (!btn) return;
      btn.disabled = true;
      setStatus("Generating…");

      if (typeof window.generateStable !== "function") {
        console.error("[actions] window.generateStable is not defined");
        setStatus("Error: generator not loaded.");
        return;
      }

      const note = await window.generateStable();

      const pre = $("soapTextOut");
      if (pre && note) pre.textContent = note;

      const fmtEl = $("noteType") || $("note-format");
      const noteType = ((fmtEl?.value || "").toUpperCase() === "BIRP") ? "BIRP" : "SOAP";
      if (!window.currentUUID) {
        window.currentUUID = (crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)));
      }

      await fetch("/api/notes/" + encodeURIComponent(window.currentUUID), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteType, text: (note || pre?.textContent || "") })
      }).then(r => r.json()).catch(()=>{});

      if (typeof window.refreshList === "function") {
        try { await window.refreshList(); } catch {}
      }
      setStatus("Done.");
    } catch (err) {
      console.error("[actions] generate failed", err);
      setStatus("Generation failed. See console for details.");
    } finally {
      const btn = $("btnGenerate");
      if (btn) btn.disabled = false;
    }
  }

  const btn = $("btnGenerate");
  if (btn) btn.addEventListener("click", onGenerateClick, { passive: true });

  const fbtn = document.getElementById("btn-finalize");
  if (!fbtn) return;
  async function finalizeNow(e) {
    try {
      e && e.preventDefault && e.preventDefault();

      const btn = document.getElementById('btn-finalize');
      btn.disabled = true;

      const uuid = (document.getElementById('current-note-uuid')?.value || '').trim();
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
