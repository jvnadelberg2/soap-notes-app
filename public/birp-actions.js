"use strict";

// ------------------ Helpers ------------------

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function isChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

// ------------------ Build Data Package ------------------

function buildBirpBody() {
  return {
    noteType: "birp",

    // Patient
    patient: val("patient"),
    dob: val("dob"),
    sex: val("sex"),
    mrn: val("mrn"),

    // Telehealth
    telePlatform: val("telePlatform"),
    teleModality: val("teleModality"),
    telePatientLocation: val("telePatientLocation"),
    teleConsent: isChecked("teleConsent"),
    teleConsentAt: val("teleConsentAt"),

    // Clinician metadata
    provider: val("provider"),
    credentials: val("credentials"),
    npi: val("npi"),
    clinic: val("clinic"),
    providerLocation: val("providerLocation"),
    specialty: val("specialty"),
    model: val("llmModel"),

    // BIRP fields
    birpBehavior: val("birpBehavior"),
    birpIntervention: val("birpIntervention"),
    birpResponse: val("birpResponse"),
    birpPlan: val("birpPlan"),

    // ICD Codes (shared)
    icd_codes: val("icdCodes")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),

    // Flags
    assistLevel: Number(val("assistLevel") || 0),
    finalized: false,
  };
}

// ------------------ Generate BIRP ------------------

async function generateBIRP() {
  const body = buildBirpBody();

  try {
    const res = await fetch("/api/birp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.ok) {
      document.getElementById("generatedNote").value = data.text;
      console.log("[BIRP] Note generated successfully");
    } else {
      document.getElementById("generatedNote").value =
        "Error: " + (data.error || "BIRP generation failed");
      console.warn("[BIRP] Error response:", data.error);
    }
  } catch (e) {
    document.getElementById("generatedNote").value =
      "Error: " + e.message;
    console.error("[BIRP] Exception:", e);
  }
}

// ------------------ Export BIRP PDF ------------------

async function exportBirpPdf() {
  const body = buildBirpBody();

  // Map BIRP fields to match PDF builder expectations
  const pdfPayload = {
    ...body,
    behavior: body.birpBehavior,
    intervention: body.birpIntervention,
    response: body.birpResponse,
    plan: body.birpPlan,
  };

  try {
    const res = await fetch("/export/pdf/birp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pdfPayload),
    });

    if (!res.ok) throw new Error("PDF export failed");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    // 🚀 Open in a new browser tab
    window.open(url, "_blank");

    console.log("[BIRP] PDF opened in new tab");
  } catch (e) {
    console.error("[BIRP] ❌ Error exporting PDF:", e);
    alert("Error exporting BIRP PDF: " + e.message);
  }
}
// ------------------ Permanent Handlers ------------------

document.addEventListener("DOMContentLoaded", () => {
  const genBtn = document.getElementById("generateNote");
  const pdfBtn = document.getElementById("exportPdf");

  if (genBtn) {
    genBtn.addEventListener(
      "click",
      (e) => {
        const noteType = document.getElementById("noteType")?.value;
        if (noteType === "birp") {
          e.preventDefault();
          e.stopImmediatePropagation(); // cancel SOAP
          console.log("[BIRP] Generate button intercepted");
          generateBIRP();
        } else {
          console.log("[SOAP] Generate button untouched (BIRP skipped)");
        }
      },
      true
    );
  }

  if (pdfBtn) {
    pdfBtn.addEventListener(
      "click",
      (e) => {
        const noteType = document.getElementById("noteType")?.value;
        if (noteType === "birp") {
          e.preventDefault();
          e.stopImmediatePropagation(); // cancel SOAP export
          console.log("[BIRP] Export PDF intercepted");
          exportBirpPdf();
        } else {
          console.log("[SOAP] Export PDF untouched (BIRP skipped)");
        }
      },
      true
    );
  }
});