"use strict";

/* ------------------ Small UX Helpers (added) ------------------ */
function ensureLoadingIndicator() {
  if (!document.getElementById("__ux_injected_styles")) {
    const style = document.createElement("style");
    style.id = "__ux_injected_styles";
    style.textContent = `
      button.__btn-flash {
        background-color: #cce5ff !important;
        transition: background-color 0.5s ease;
      }
      #loading-indicator {
        display: none;
        color: #007bff;
        font-weight: 600;
        margin: 8px 0;
      }
    `;
    document.head.appendChild(style);
  }

  let node = document.getElementById("loading-indicator");
  if (!node) {
    node = document.createElement("div");
    node.id = "loading-indicator";
    node.textContent = "⏳ Generating note…";
    const genNote = document.getElementById("generatedNote");
    if (genNote && genNote.parentElement) {
      genNote.parentElement.insertAdjacentElement("beforebegin", node);
    } else {
      const header = document.querySelector("header") || document.body;
      header.insertAdjacentElement("afterend", node);
    }
  }
  return node;
}
function showLoading(show) {
  const node = document.getElementById("loading-indicator") || ensureLoadingIndicator();
  node.style.display = show ? "block" : "none";
}
function flashButton(btn) {
  if (!btn) return;
  btn.classList.add("__btn-flash");
  setTimeout(() => btn.classList.remove("__btn-flash"), 500);
}

/* ------------------ SOAP Generation ------------------ */
async function generateSOAP() {
  const body = {
    assistLevel: Number(document.getElementById("assistLevel")?.value || 0),
    chiefComplaint: document.getElementById("chiefComplaint")?.value || "",
    hpi: document.getElementById("hpi")?.value || "",
    pmh: document.getElementById("pmh")?.value || "",
    psh: document.getElementById("psh")?.value || "",
    familyHistory: document.getElementById("familyHistory")?.value || "",
    socialHistory: document.getElementById("socialHistory")?.value || "",
    allergies: document.getElementById("allergies")?.value || "",
    ros: document.getElementById("ros")?.value || "",
    physicalExam: document.getElementById("physicalExam")?.value || "",
    bp: document.getElementById("bp")?.value || "",
    hr: document.getElementById("hr")?.value || "",
    temp: document.getElementById("temp")?.value || "",
    rr: document.getElementById("rr")?.value || "",
    spo2: document.getElementById("spo2")?.value || "",
    height: document.getElementById("height")?.value || "",
    weight: document.getElementById("weight")?.value || "",
    labs: document.getElementById("labs")?.value || "",
    medications: document.getElementById("medications")?.value || "",
    model: document.getElementById("llmModel")?.value || "",
    provider: document.getElementById("provider")?.value || ""
  };

  try {
    showLoading(true);
    const res = await fetch("/api/soap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log("Generated SOAP JSON:", data);

    window.currentNoteType = "soap";
    if (data) {
      if (data.id) window.currentNoteId = data.id;

      document.getElementById("generatedNote").value =
        data.generatedNote || data.text || data.noteText || data.note || "No note returned";

      if (data.icdSuggestions) {
        const icdBox = document.getElementById("icd-box");
        if (icdBox) {
          icdBox.textContent = data.icdSuggestions
            .map(s => `${s.code} — ${s.description}`)
            .join("\n");
        }
      }
    } else {
      document.getElementById("generatedNote").value =
        "Error: SOAP generation returned no data";
    }
  } catch (e) {
    document.getElementById("generatedNote").value = "Error: " + e.message;
  } finally {
    showLoading(false);
  }
}

/* ------------------ BIRP Generation ------------------ */
async function generateBIRP() {
  const body = {
    birpBehavior: document.getElementById("birpBehavior")?.value || "",
    birpIntervention: document.getElementById("birpIntervention")?.value || "",
    birpResponse: document.getElementById("birpResponse")?.value || "",
    birpPlan: document.getElementById("birpPlan")?.value || "",
    assistLevel: Number(document.getElementById("assistLevel")?.value || 0),
    model: document.getElementById("llmModel")?.value || "",
    provider: document.getElementById("provider")?.value || ""
  };

  try {
    showLoading(true);
    const res = await fetch("/api/birp-enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log("Generated BIRP JSON:", data);

    window.currentNoteType = "birp";
    if (data) {
      if (data.id) window.currentNoteId = data.id;

      document.getElementById("generatedNote").value =
        data.generatedNote || data.text || data.note || "No note returned";
    } else {
      document.getElementById("generatedNote").value =
        "Error: BIRP generation returned no data";
    }
  } catch (e) {
    document.getElementById("generatedNote").value = "Error: " + e.message;
  } finally {
    showLoading(false);
  }
}

/* ------------------ Generate Button ------------------ */
document.getElementById("generateNote")?.addEventListener("click", (e) => {
  e.preventDefault();
  flashButton(e.currentTarget);

  const noteType = document.getElementById("noteType")?.value;
  if (noteType === "soap") {
    generateSOAP();
  } else if (noteType === "birp") {
    generateBIRP();
  }
});

/* ------------------ Signing ------------------ */
document.addEventListener("DOMContentLoaded", () => {
  ensureLoadingIndicator();

  document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => flashButton(btn));
  });

  const signBtn = document.getElementById("signNote");
  const clearBtn = document.getElementById("clearPatient");
  let isSigned = false;

  function lockUI() {
    document.querySelectorAll("input, textarea, select, button").forEach(el => {
      if (el.id !== "clearPatient" && el.id !== "exportPdf") {
        el.disabled = true;
      }
    });
  }

  function unlockUI() {
    document.querySelectorAll("input, textarea, select, button").forEach(el => {
      el.disabled = false;
    });
    signBtn.textContent = "Sign Note";
    signBtn.style.backgroundColor = "";
    isSigned = false;
  }

  async function handleSign() {
    if (isSigned) return;

    const provider = document.getElementById("provider").value.trim();
    const noteText = document.getElementById("generatedNote").value.trim();
    const id = window.currentNoteId || "";

    if (!provider || !noteText || !id) {
      alert("Missing provider, note text, or note ID — cannot sign.");
      return;
    }

    try {
      const resp = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          noteText,
          provider,
          providerId: document.getElementById("npi").value || "",
          specialty: document.getElementById("specialty").value || "",
          assistLevel: document.getElementById("assistLevel").value,
          patientId: document.getElementById("mrn").value || "",
          model: document.getElementById("llmModel")?.value || "",
          noteType: window.currentNoteType || ""
        })
      });
      const data = await resp.json();
      window.lastSignData = data;
      console.log("[sign] full response:", data);

      if (data.ok) {
        signBtn.textContent = "Signed";
        signBtn.style.backgroundColor = "pink";
        signBtn.disabled = true;
        isSigned = true;
        lockUI();
        document.getElementById("signatureId").value = data.signatureId || "";
        document.getElementById("signedAt").value = data.signedAt || "";
        alert("Note signed successfully.");
      } else {
        alert("Signing failed: " + (data.error || "unknown error"));
      }
    } catch (err) {
      console.error("Sign error:", err);
      alert("Error signing note: " + err.message);
    }
  }

  function clearPatientData() {
    const keep = [
      "provider","credentials","npi","clinic","providerLocation",
      "assistLevel","specialty","noteType"
    ];
    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (!keep.includes(el.id)) {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else if (el.type === "checkbox" || el.type === "radio") el.checked = false;
        else el.value = "";
      }
    });
    const icdBox = document.getElementById("icd-box");
    if (icdBox) icdBox.textContent = "";
    const genNote = document.getElementById("generatedNote");
    if (genNote) genNote.value = "";
    window.currentNoteId = null;
    document.getElementById("signatureId").value = "";
    document.getElementById("signedAt").value = "";
  }

  if (signBtn) signBtn.addEventListener("click", handleSign);
  if (clearBtn) clearBtn.addEventListener("click", () => {
    clearPatientData();
    unlockUI();
  });
});

/* ------------------ Unified Export PDF (SOAP + BIRP) ------------------ */

// helper: preprocess note before regex
function preprocessNoteText(raw) {
  let text = raw;

  // Normalize headers
  text = text.replace(/\bASSESSMENT\b/gi, "Assessment");
  text = text.replace(/\bPLAN\b/gi, "Plan");

  // Remove disclaimers/draft sections
  text = text.replace(/Confidentiality Notice:[\s\S]*?Printed:[^\n]+/gi, "");
  text = text.replace(/DRAFT[\s\S]*?(?=Assessment|Plan|$)/gi, "");

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n");

  // Add END marker
  text += "\n[[END]]";

  return text;
}

document.getElementById("exportPdf")?.addEventListener("click", async (e) => {
  e.preventDefault();
  flashButton(e.currentTarget);

  const noteType = window.currentNoteType || document.getElementById("noteType")?.value || "soap";

  try {
    let endpoint = "/export/pdf";
    const payload = {
      patient: document.getElementById("patient")?.value || "",
      dob: document.getElementById("dob")?.value || "",
      sex: document.getElementById("sex")?.value || "",
      mrn: document.getElementById("mrn")?.value || "",
      provider: document.getElementById("provider")?.value || "",
      credentials: document.getElementById("credentials")?.value || "",
      npi: document.getElementById("npi")?.value || "",
      clinic: document.getElementById("clinic")?.value || "",
      providerLocation: document.getElementById("providerLocation")?.value || "",
      specialty: document.getElementById("specialty")?.value || "",
      signatureId: document.getElementById("signatureId")?.value || "",
      signedAt: document.getElementById("signedAt")?.value || "",
      date: new Date().toLocaleString(),
    };

    if (noteType === "soap") {
      const subjParts = [];
      if (document.getElementById("chiefComplaint")?.value)
        subjParts.push("Chief Complaint: " + document.getElementById("chiefComplaint").value);
      if (document.getElementById("hpi")?.value)
        subjParts.push("HPI: " + document.getElementById("hpi").value);
      if (document.getElementById("pmh")?.value)
        subjParts.push("PMH: " + document.getElementById("pmh").value);
      if (document.getElementById("psh")?.value)
        subjParts.push("PSH: " + document.getElementById("psh").value);
      if (document.getElementById("familyHistory")?.value)
        subjParts.push("FH: " + document.getElementById("familyHistory").value);
      if (document.getElementById("socialHistory")?.value)
        subjParts.push("SH: " + document.getElementById("socialHistory").value);
      if (document.getElementById("ros")?.value)
        subjParts.push("ROS: " + document.getElementById("ros").value);
      if (document.getElementById("allergies")?.value)
        subjParts.push("Allergies: " + document.getElementById("allergies").value);
      payload.subjective = subjParts.join("\n");

      const objParts = [];
      const vitals = [
        "BP: " + (document.getElementById("bp")?.value || ""),
        "HR: " + (document.getElementById("hr")?.value || ""),
        "Temp: " + (document.getElementById("temp")?.value || ""),
        "RR: " + (document.getElementById("rr")?.value || ""),
        "SpO2: " + (document.getElementById("spo2")?.value || ""),
        "Height: " + (document.getElementById("height")?.value || ""),
        "Weight: " + (document.getElementById("weight")?.value || ""),
      ].filter(v => !v.endsWith(": ")).join(", ");
      if (vitals) objParts.push(vitals);
      if (document.getElementById("labs")?.value)
        objParts.push("Labs: " + document.getElementById("labs").value);
      if (document.getElementById("physicalExam")?.value)
        objParts.push("Exam: " + document.getElementById("physicalExam").value);
      payload.objective = objParts.join("\n");

      const icdBoxEl = document.getElementById("icd-box");
      if (icdBoxEl && typeof icdBoxEl.textContent === "string") {
        payload.icd_codes = icdBoxEl.textContent
          .split("\n")
          .map(c => c.trim())
          .filter(c => c.length > 0);
      } else {
        payload.icd_codes = [];
      }

      const generated = document.getElementById("generatedNote")?.value || "";
      console.log("[exportPdf] generated note raw:", generated);

      const clean = preprocessNoteText(generated);
      console.log("[exportPdf] preprocessed note:", clean);

      const rxAssess = /\bAssessment\b[\s:]*([\s\S]*?)(?=\bPlan\b)/i;
      const rxPlan   = /\bPlan\b[\s:]*([\s\S]*?)(?=\[\[END\]\])/i;

      payload.assessment = (clean.match(rxAssess)?.[1] || "").trim();
      payload.plan       = (clean.match(rxPlan)?.[1] || "").trim();

      console.log("[exportPdf] final assessment:", payload.assessment);
      console.log("[exportPdf] final plan:", payload.plan);

  } else if (noteType === "birp") {
  endpoint = "/export/pdf/birp";
  payload.behavior = document.getElementById("birpBehavior")?.value || "";
  payload.intervention = document.getElementById("birpIntervention")?.value || "";
  payload.response = document.getElementById("birpResponse")?.value || "";
  payload.plan = document.getElementById("birpPlan")?.value || "";
  payload.generatedNote = document.getElementById("generatedNote")?.value || "";
  payload.telePlatform = document.getElementById("telePlatform")?.value || "";
  payload.teleModality = document.getElementById("teleModality")?.value || "";
  payload.telePatientLocation = document.getElementById("telePatientLocation")?.value || "";
  payload.teleConsentAt = document.getElementById("teleConsentAt")?.value || "";
  payload.teleConsent = document.getElementById("teleConsent")?.checked || false;
}
    

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to export PDF");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => window.URL.revokeObjectURL(url), 30000);
  } catch (err) {
    console.error("[export] Error exporting PDF:", err);
    alert("Failed to export PDF: " + err.message);
  }
});

window.showNoteType = function () {
  console.log("currentNoteType:", window.currentNoteType);
};