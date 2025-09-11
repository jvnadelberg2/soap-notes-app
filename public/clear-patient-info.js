/* BEGIN:ARCH-COMMENT
File: public/clear-patient-info.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
/* /clear-patient-info.js — v2 */
(function () {
  "use strict";

  const FIELD_IDS = [
    // Patient info
    "patient", "mrn", "dob", "sex", "age",
    // Patient data
    "chiefComplaint", "hpi", "pmh", "fh", "sh", "ros",
    "vBP", "vHR", "vRR", "vTemp", "vWeight", "vO2Sat",
    "diagnostics", "exam",
  ];

  function $(id) { return document.getElementById(id); }

  function resetField(id) {
    const el = $(id);
    if (!el) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.value = "";
      // fire input so any persistence listeners update
      el.dispatchEvent(new Event("input", { bubbles: true }));
      // also clear validity outlines, if any
      el.blur(); el.focus();
    } else if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function clearRosBuilderUI() {
    // If the quick builder is present, reset it to "all negative"
    const wrap = document.getElementById("rosQuickBuilder");
    if (!wrap) return;

    wrap.querySelectorAll(".ros-neg").forEach(cb => { cb.checked = true; });
    wrap.querySelectorAll(".ros-pos").forEach(i => { i.value = ""; });

    // ensure textarea is updated from the builder’s current state (empty)
    const ros = $("ros");
    if (ros) {
      ros.value = "";
      ros.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function clearSoapOutput() {
    const out = $("soapTextOut");
    if (!out) return;
    out.textContent = "";     // remove user-visible note
    out.innerHTML = "";       // belt & suspenders for contenteditable
  }

  function clearPersistedUI() {
    // Best-effort: if your persist layer stores by id or "persist:<id>", clear both.
    try {
      if (!("localStorage" in window)) return;
      FIELD_IDS.forEach(id => {
        localStorage.removeItem(id);
        localStorage.removeItem(`persist:${id}`);
      });
      // also clear the generated note if it’s stored
      localStorage.removeItem("soapTextOut");
      localStorage.removeItem("persist:soapTextOut");
    } catch (_) { /* ignore */ }
    // If a global helper exists, let it perform its own cleanup.
    try {
      window.persistUI && typeof window.persistUI.clear === "function" && window.persistUI.clear();
    } catch (_) { /* ignore */ }
  }

  function setStatus(msg) {
    const s = $("status");
    if (s) s.textContent = msg;
  }

  function clearPatientData() {
    FIELD_IDS.forEach(resetField);
    clearRosBuilderUI();
    clearSoapOutput();
    clearPersistedUI();
    setStatus("Cleared patient data and note.");
  }

  function init() {
    const btn = $("btnClear");
    if (!btn) return;
    if (btn.dataset.bound === "1") return; // avoid double-binding
    btn.dataset.bound = "1";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      clearPatientData();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
