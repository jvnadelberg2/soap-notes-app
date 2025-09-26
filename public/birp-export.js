"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("exportPdf");
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    const noteType = document.getElementById("noteType")?.value || "soap";
    if (noteType !== "birp") return; // only handle BIRP here

    e.preventDefault();

    try {
      const payload = {
        // the editable note text (source of truth)
        generatedNote: document.getElementById("generatedNote")?.value || "",

        // BIRP fields (kept for future use if you want to show structured sections too)
        behavior: document.getElementById("birpBehavior")?.value || "",
        intervention: document.getElementById("birpIntervention")?.value || "",
        response: document.getElementById("birpResponse")?.value || "",
        plan: document.getElementById("birpPlan")?.value || "",

        // Patient
        patient: document.getElementById("patient")?.value || "",
        dob: document.getElementById("dob")?.value || "",
        sex: document.getElementById("sex")?.value || "",
        mrn: document.getElementById("mrn")?.value || "",

        // Clinician
        provider: document.getElementById("provider")?.value || "",
        credentials: document.getElementById("credentials")?.value || "",
        npi: document.getElementById("npi")?.value || "",
        clinic: document.getElementById("clinic")?.value || "",
        providerLocation: document.getElementById("providerLocation")?.value || "",
        specialty: document.getElementById("specialty")?.value || "",

        // Telehealth
        telePlatform: document.getElementById("telePlatform")?.value || "",
        teleModality: document.getElementById("teleModality")?.value || "",
        telePatientLocation: document.getElementById("telePatientLocation")?.value || "",
        teleConsentAt: document.getElementById("teleConsentAt")?.value || "",
        teleConsent: document.getElementById("teleConsent")?.checked || false,

        // Finalization
        finalized: document.getElementById("finalizeNote")?.checked || false,

        // Timestamp
        date: new Date().toLocaleString(),
      };

      // send to BIRP PDF endpoint
      const res = await fetch("/export/pdf/birp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to export BIRP PDF");

      // open in a new tab (consistent UX with SOAP)
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error("[birp-export] Error exporting PDF:", err);
      alert("Failed to export BIRP PDF. Check console for details.");
    }
  });
});