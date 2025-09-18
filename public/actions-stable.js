"use strict";

// ------------------ Helpers ------------------

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function persist(id) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    const saved = localStorage.getItem("field:" + id);
    if (saved && !el.value) el.value = saved;
  } catch {}
  el.addEventListener("input", () => {
    try {
      localStorage.setItem("field:" + id, el.value);
    } catch {}
  });
}

// Persist dropdowns
["provider", "model", "specialty"].forEach(persist);

// ------------------ SOAP Generation ------------------

async function generateSOAP() {
  const body = {
    assistLevel: Number(document.getElementById("assistLevel")?.value || 1),

    // Subjective
    chiefComplaint: val("chiefComplaint"),
    hpi: val("hpi"),
    pmh: val("pmh"),
    psh: val("psh"),
    familyHistory: val("familyHistory"),
    socialHistory: val("socialHistory"),
    ros: val("ros"),
    allergies: val("allergies"),

    // Objective
    vBP: val("bp"),
    vHR: val("hr"),
    vRR: val("rr"),
    vTemp: val("temp"),
    vO2Sat: val("spo2"),
    height: val("height"),
    vWeight: val("weight"),
    painScore: val("pain"),
    diagnostics: val("labs"),
    exam: val("physicalExam"),
    medications: val("medications"),

    // Meta
    provider: val("provider"),
    model: val("llmModel"),
    specialty: val("specialty")
  };

  try {
    const res = await fetch("/api/soap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById("generatedNote").value = data.text;
    } else {
      document.getElementById("generatedNote").value =
        "Error: " + (data.error || "SOAP generation failed");
    }
  } catch (e) {
    document.getElementById("generatedNote").value = "Error: " + e.message;
  }
}

document.getElementById("generateNote")?.addEventListener("click", (e) => {
  e.preventDefault();
  generateSOAP();
});

// ------------------ BIRP Generation ------------------

async function generateBIRP() {
  const body = {
    useInference: true,
    behavior: val("birpBehavior"),
    intervention: val("birpIntervention"),
    response: val("birpResponse"),
    plan: val("birpPlan"),
    model: val("llmModel")
  };

  try {
    const res = await fetch("/api/birp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById("generatedNote").value = data.text;
    } else {
      document.getElementById("generatedNote").value =
        "Error: " + (data.error || "BIRP generation failed");
    }
  } catch (e) {
    document.getElementById("generatedNote").value = "Error: " + e.message;
  }
}

document.getElementById("genBirpBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  generateBIRP();
});

// ------------------ ICD Search ------------------

async function searchICD() {
  const query = val("icdSearch");
  if (!query) return;
  try {
    const res = await fetch(`/api/icd/search?q=${encodeURIComponent(query)}&limit=200`);
    const data = await res.json();
    const box = document.getElementById("icd-box");
    box.innerHTML = "";

    if (!data.results || !data.results.length) {
      box.textContent = "No matches found.";
      return;
    }

    // Group by category
    const grouped = {};
    data.results.forEach(r => {
      const cat = r.category || "Uncategorized";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    });

    Object.keys(grouped).sort().forEach(cat => {
      const details = document.createElement("details");
      details.open = true;

      const summary = document.createElement("summary");
      summary.textContent = cat;
      details.appendChild(summary);

      const ul = document.createElement("ul");
      grouped[cat].forEach(r => {
        const li = document.createElement("li");
        li.textContent = `${r.code} — ${r.description}`;
        li.addEventListener("click", () => {
          const out = document.getElementById("icdCodes");
          const current = out.value.trim();
          out.value = current
            ? `${current}\n${r.code} — ${r.description}`
            : `${r.code} — ${r.description}`;
        });
        ul.appendChild(li);
      });

      details.appendChild(ul);
      box.appendChild(details);
    });
  } catch (e) {
    console.error("ICD search failed:", e);
  }
}

document.getElementById("searchIcdBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  searchICD();
});

// ------------------ Restore dropdowns on load ------------------

window.addEventListener("DOMContentLoaded", () => {
  ["provider", "llmModel", "specialty"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const saved = localStorage.getItem("field:" + id);
    if (saved) el.value = saved;
  });
});

document.getElementById("clearPatient")?.addEventListener("click", (e) => {
  e.preventDefault();

  // Clear all textareas/inputs
  document.querySelectorAll("input, textarea").forEach(el => {
    if (el.type === "checkbox" || el.type === "radio") {
      el.checked = false;
    } else if (el.id !== "provider" && el.id !== "llmModel" && el.id !== "specialty") {
      // keep clinician identity/settings
      el.value = "";
    }
  });

  // Explicitly clear ICD fields
  const icdCodes = document.getElementById("icdCodes");
  if (icdCodes) icdCodes.value = "";

  const icdBox = document.getElementById("icd-box");
  if (icdBox) icdBox.innerHTML = "";
});


// ------------------ Clear Patient Data ------------------

document.getElementById("clearPatient")?.addEventListener("click", (e) => {
  e.preventDefault();

  // Define patient-related IDs to clear
  const patientFields = [
    "patient", "dob", "sex", "mrn",
    "chiefComplaint", "hpi", "pmh", "psh",
    "familyHistory", "socialHistory", "allergies", "ros",
    "bp", "hr", "rr", "temp", "spo2", "height", "weight",
    "labs", "physicalExam", "medications",
    "icdCodes", "generatedNote"
  ];

  patientFields.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = false;
      } else {
        el.value = "";
      }
    }
  });

  // Clear ICD search results box
  const icdBox = document.getElementById("icd-box");
  if (icdBox) icdBox.innerHTML = "";

  // Also reset Telehealth consent checkbox
  const teleConsent = document.getElementById("teleConsent");
  if (teleConsent) teleConsent.checked = false;

  // Reset telehealth date/time if present
  const teleConsentAt = document.getElementById("teleConsentAt");
  if (teleConsentAt) teleConsentAt.value = "";
});