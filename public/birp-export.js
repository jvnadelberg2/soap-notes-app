"use strict";

async function exportBirpPdf() {
  try {
    const noteText = document.getElementById("generatedNote")?.value || "";
    const payload = {
      noteText,
      behavior: window.birpBehavior?.value || "",
      intervention: window.birpIntervention?.value || "",
      response: window.birpResponse?.value || "",
      plan: window.birpPlan?.value || "",
      patient: document.getElementById("patientName")?.value || "",
      dob: document.getElementById("dob")?.value || "",
      sex: document.getElementById("sex")?.value || "",
      mrn: document.getElementById("mrn")?.value || "",
      provider: document.getElementById("provider")?.value || "",
      credentials: document.getElementById("credentials")?.value || "",
      npi: document.getElementById("npi")?.value || "",
      clinic: document.getElementById("clinic")?.value || "",
      providerLocation: document.getElementById("providerLocation")?.value || "",
      telePlatform: document.getElementById("telePlatform")?.value || "",
      teleConsent: document.getElementById("teleConsent")?.checked || false,
      teleConsentAt: document.getElementById("teleConsentAt")?.value || "",
      telePatientLocation: document.getElementById("telePatientLocation")?.value || "",
      teleModality: document.getElementById("teleModality")?.value || "",
      finalized: document.getElementById("finalizeNote")?.checked || false,
      date: new Date().toLocaleString(),
    };

    const res = await fetch("/export/pdf/birp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to export PDF");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "birp-note.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[birp-export] Error exporting PDF:", err);
    alert("Failed to export BIRP PDF. Check console for details.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("exportBirpPdfBtn");
  if (btn) btn.addEventListener("click", exportBirpPdf, { passive: true });
});