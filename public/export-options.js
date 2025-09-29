"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("exportPdf");
  const noteTypeSel = document.getElementById("noteType");
  if (!btn || !noteTypeSel) return;

  function updateButtonVisibility() {
    const t = noteTypeSel.value;
    btn.style.display = t === "soap" || t === "birp" ? "inline-block" : "none";
  }
  noteTypeSel.addEventListener("change", updateButtonVisibility, { passive: true });
  updateButtonVisibility();

  btn.addEventListener("click", async () => {
    try {
      const noteType = noteTypeSel.value || "soap";
      if (noteType === "birp") {
        console.log("[export-options] handoff to birp-export.js");
        return;
      }

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

        // Telehealth
        telePlatform: document.getElementById("telePlatform").value,
        teleModality: document.getElementById("teleModality").value,
        telePatientLocation: document.getElementById("telePatientLocation").value,
        teleConsentAt: document.getElementById("teleConsentAt").value,
        teleConsent: document.getElementById("teleConsent").checked,

        // 🔑 Signature metadata
        signatureId: document.getElementById("signatureId")?.value || "",
        signedAt: document.getElementById("signedAt")?.value || "",

        // Finalization checkbox (ignored for signed logic now)
        finalized: document.getElementById("finalizeNote")?.checked || false,
      };

      // SOAP-specific sections
      note.subjective = {
        chiefComplaint: document.getElementById("chiefComplaint").value,
        hpi: document.getElementById("hpi").value,
        pmh: document.getElementById("pmh").value,
        psh: document.getElementById("psh").value,
        familyHistory: document.getElementById("familyHistory").value,
        socialHistory: document.getElementById("socialHistory").value,
        allergies: document.getElementById("allergies").value,
        ros: document.getElementById("ros").value,
      };

      note.objective = {
        physicalExam: document.getElementById("physicalExam").value,
        vitals: [
          "BP: " + document.getElementById("bp").value,
          "HR: " + document.getElementById("hr").value,
          "Temp: " + document.getElementById("temp").value,
          "RR: " + document.getElementById("rr").value,
          "SpO2: " + document.getElementById("spo2").value,
          "Height: " + document.getElementById("height").value,
          "Weight: " + document.getElementById("weight").value,
        ]
          .filter((v) => !v.endsWith(": "))
          .join(", "),
        labs: document.getElementById("labs").value,
      };

      note.icd_codes = document
        .getElementById("icd-box")
        .value.split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Assessment & Plan extraction
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

      console.log("[export-options] exporting soap note", note);

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
