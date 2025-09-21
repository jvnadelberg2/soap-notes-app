"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("exportPdf");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      const note = {
        // Patient
        patient: document.getElementById("patient").value,
        dob: document.getElementById("dob").value,
        sex: document.getElementById("sex").value,
        mrn: document.getElementById("mrn").value,

        // Clinician
        provider: document.getElementById("provider").value,
        credentials: document.getElementById("credentials").value,
        npi: document.getElementById("npi").value,
        clinic: document.getElementById("clinic").value,
        providerLocation: document.getElementById("providerLocation").value,
        specialty: document.getElementById("specialty").value,

        // Subjective subsections
        subjective: {
          chiefComplaint: document.getElementById("chiefComplaint").value,
          hpi: document.getElementById("hpi").value,
          pmh: document.getElementById("pmh").value,
          psh: document.getElementById("psh").value,
          familyHistory: document.getElementById("familyHistory").value,
          socialHistory: document.getElementById("socialHistory").value,
          allergies: document.getElementById("allergies").value,
          ros: document.getElementById("ros").value,
        },

        // Objective subsections
        objective: {
          physicalExam: document.getElementById("physicalExam").value,
          vitals: [
            "BP: " + document.getElementById("bp").value,
            "HR: " + document.getElementById("hr").value,
            "Temp: " + document.getElementById("temp").value,
            "RR: " + document.getElementById("rr").value,
            "SpO2: " + document.getElementById("spo2").value,
            "Height: " + document.getElementById("height").value,
            "Weight: " + document.getElementById("weight").value,
          ].filter(v => !v.endsWith(": ")).join(", "),
          labs: document.getElementById("labs").value,
        },

        // ICD codes
        icd_codes: document
          .getElementById("icdCodes")
          .value.split("\n")
          .map(c => c.trim())
          .filter(c => c.length > 0),

        // Telehealth
        telePlatform: document.getElementById("telePlatform").value,
        teleModality: document.getElementById("teleModality").value,
        telePatientLocation: document.getElementById("telePatientLocation").value,
        teleConsentAt: document.getElementById("teleConsentAt").value,
        teleConsent: document.getElementById("teleConsent").checked,

        // Finalization flag
        finalized: document.getElementById("finalized")?.checked || false,
      };

      // Extract Assessment & Plan from generated note (fallback)
      const generated = document.getElementById("generatedNote").value;
      try {
        const parsed = JSON.parse(generated);
        note.assessment = parsed.assessment || "";
        note.plan = parsed.plan || "";
      } catch {
        const matchA = generated.match(/Assessment[:\n]\s*([\s\S]*?)(?=Plan[:\n]|$)/i);
        const matchP = generated.match(/Plan[:\n]\s*([\s\S]*)/i);
        note.assessment = matchA ? matchA[1].trim() : "";
        note.plan = matchP ? matchP[1].trim() : "";
      }

      // Debug logs
      console.log("Finalized:", note.finalized);
      console.log("Assessment:", note.assessment);
      console.log("Plan:", note.plan);

      // Send to backend
      const res = await fetch("/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });

      if (!res.ok) throw new Error("PDF export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("[export-options] ❌ Error exporting PDF:", err);
      alert("Error exporting PDF: " + err.message);
    }
  });
});