"use strict";

(function () {
  const keys = {
    provider: "clinician.provider",
    credentials: "clinician.credentials",
    npi: "clinician.npi",
    clinic: "clinician.clinic",
    providerLocation: "clinician.location",
    specialty: "workflow.specialty",
    assistLevel: "workflow.assistLevel",
    redact: "workflow.redact",
    noteType: "workflow.noteType",
    modelName: "workflow.modelName",
  };

  /* ==========================================================
   * Helpers
   * ========================================================== */
  function save(id, key, isBool) {
    const el = document.getElementById(id);
    if (!el) return;
    const v = isBool ? !!el.checked : (el.value || "");
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch (e) {}
  }

  function load(id, key, isBool) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const v = localStorage.getItem(key);
      if (v == null) return;
      const parsed = JSON.parse(v);
      if (isBool) {
        el.checked = !!parsed;
      } else {
        el.value = parsed || "";
      }
    } catch (e) {}
  }

  function bindPersist(id, key, isBool) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(
      "change",
      function () {
        save(id, key, isBool);
      },
      { passive: true }
    );
  }

  /* ==========================================================
   * Specialty Dropdown
   * ========================================================== */
  async function populateSpecialty() {
    const sel = document.getElementById("specialty");
    if (!sel) return;
    sel.innerHTML = "";

    let list = [];
    try {
      const r = await fetch("/api/specialties");
      if (r.ok) {
        const j = await r.json();
        if (j && Array.isArray(j.specialties)) list = j.specialties;
      }
    } catch (e) {}

    if (!list.length) {
      list = [
        "General Practice",
        "Family Medicine Physician",
        "Internal Medicine Physician",
        "Pediatrician",
        "Cardiologist",
        "Endocrinologist",
        "Gastroenterologist",
        "Pulmonologist",
        "Psychiatrist",
        "Dermatologist",
      ];
    }

    list.forEach(function (name) {
      const o = document.createElement("option");
      o.value = name;
      o.textContent = name;
      sel.appendChild(o);
    });

    const saved = localStorage.getItem(keys.specialty);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) || "";
        if (
          parsed &&
          [].some.call(sel.options, function (o) {
            return o.value === parsed;
          })
        ) {
          sel.value = parsed;
        }
      } catch (e) {}
    }

    sel.addEventListener(
      "change",
      function () {
        try {
          localStorage.setItem(keys.specialty, JSON.stringify(sel.value || ""));
        } catch (e) {}
      },
      { passive: true }
    );
  }

  /* ==========================================================
   * Model Dropdown
   * ========================================================== */
  async function populateModels() {
    const sel = document.getElementById("llmModel");
    if (!sel) return;

    // temporary loading state
    sel.innerHTML = "";
    const loading = document.createElement("option");
    loading.value = "";
    loading.textContent = "Loading models…";
    sel.appendChild(loading);

    let models = [];
    try {
      const r = await fetch("/api/models");
      if (r.ok) {
        const j = await r.json();
        // accept {models:[...]} or bare [...]
        if (Array.isArray(j)) {
          models = j;
        } else if (j && Array.isArray(j.models)) {
          models = j.models;
        }
      }
    } catch (e) {
      console.error("[persist-ui] model fetch failed:", e);
    }

    // fallback if nothing came back
    if (!models.length) models = ["llama3.1:8b"];

    // dedupe & normalize
    models = Array.from(new Set(models.filter(Boolean)));

    // rebuild the select cleanly
    sel.innerHTML = "";
    models.forEach(m => {
      const o = document.createElement("option");
      o.value = m;
      o.textContent = m;
      sel.appendChild(o);
    });

    // restore saved selection if available
    const saved = localStorage.getItem(keys.modelName);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) || "";
        if (
          parsed &&
          [].some.call(sel.options, function (o) {
            return o.value === parsed;
          })
        ) {
          sel.value = parsed;
        }
      } catch {}
    }

    sel.addEventListener(
      "change",
      function () {
        try {
          localStorage.setItem(keys.modelName, JSON.stringify(sel.value || ""));
        } catch {}
      },
      { passive: true }
    );
  }

  /* ==========================================================
   * onReady Bootstrapping
   * ========================================================== */
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(function () {
    // Load persisted fields
    load("noteType", keys.noteType, false);
    load("provider", keys.provider, false);
    load("credentials", keys.credentials, false);
    load("npi", keys.npi, false);
    load("clinic", keys.clinic, false);
    load("providerLocation", keys.providerLocation, false);
    load("redact", keys.redact, true);
    load("assistLevel", keys.assistLevel, false);

    // Persist handlers
    bindPersist("noteType", keys.noteType, false);
    bindPersist("provider", keys.provider, false);
    bindPersist("credentials", keys.credentials, false);
    bindPersist("npi", keys.npi, false);
    bindPersist("clinic", keys.clinic, false);
    bindPersist("providerLocation", keys.providerLocation, false);
    bindPersist("redact", keys.redact, true);
    bindPersist("assistLevel", keys.assistLevel, false);

    // Populate dropdowns
    populateSpecialty();
    populateModels();

    // Restore SOAP vs BIRP view
    const noteTypeSel = document.getElementById("noteType");
    if (noteTypeSel) {
      const saved = localStorage.getItem(keys.noteType);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) noteTypeSel.value = parsed;
        } catch (e) {}
      }
      noteTypeSel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
})();