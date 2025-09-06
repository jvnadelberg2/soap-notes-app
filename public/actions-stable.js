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
