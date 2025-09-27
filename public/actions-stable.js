"use strict";

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
  }
}

/* ------------------ Generate Button ------------------ */
document.getElementById("generateNote")?.addEventListener("click", (e) => {
  e.preventDefault();
  const noteType = document.getElementById("noteType")?.value;
  if (noteType === "soap") {
    generateSOAP();
  } else if (noteType === "birp") {
    generateBIRP();
  }
});

/* ------------------ Signing ------------------ */
document.addEventListener("DOMContentLoaded", () => {
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

    // 👇 Debug: capture full response
    window.lastSignData = data;
    console.log("[sign] full response:", data);

    if (data.ok) {
      signBtn.textContent = "Signed";
      signBtn.style.backgroundColor = "pink";
      signBtn.disabled = true;
      isSigned = true;
      lockUI();

      // ✅ populate hidden fields
      document.getElementById("signatureId").value = data.signatureId || "";
      document.getElementById("signedAt").value = data.signedAt || "";

      console.log("Note signed:", {
        id: data.id,
        noteType: window.currentNoteType,
        signatureId: data.signatureId,
        signedAt: data.signedAt
      });

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
      "provider",
      "credentials",
      "npi",
      "clinic",
      "providerLocation",
      "assistLevel",
      "specialty",
      "noteType"
    ];

    document.querySelectorAll("input, textarea, select").forEach(el => {
      if (!keep.includes(el.id)) {
        if (el.tagName === "SELECT") {
          el.selectedIndex = 0;
        } else if (el.type === "checkbox" || el.type === "radio") {
          el.checked = false;
        } else {
          el.value = "";
        }
      }
    });

    const icdBox = document.getElementById("icd-box");
    if (icdBox) icdBox.textContent = "";

    const genNote = document.getElementById("generatedNote");
    if (genNote) genNote.value = "";

    window.currentNoteId = null;

    const sigId = document.getElementById("signatureId");
    const sigAt = document.getElementById("signedAt");
    if (sigId) sigId.value = "";
    if (sigAt) sigAt.value = "";
  }

  if (signBtn) signBtn.addEventListener("click", handleSign);
  if (clearBtn) clearBtn.addEventListener("click", () => {
    clearPatientData();
    unlockUI();
  });
});

/* ------------------ Export PDF (SOAP + BIRP) ------------------ */
document.getElementById("exportPdf")?.addEventListener("click", async (e) => {
  e.preventDefault();

  const noteType = window.currentNoteType || "soap";

  try {
    let endpoint = "/export/pdf";
    const payload = {
      generatedNote: document.getElementById("generatedNote")?.value || "",
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

    if (noteType === "birp") {
      endpoint = "/export/pdf/birp";
      payload.behavior = document.getElementById("birpBehavior")?.value || "";
      payload.intervention = document.getElementById("birpIntervention")?.value || "";
      payload.response = document.getElementById("birpResponse")?.value || "";
      payload.plan = document.getElementById("birpPlan")?.value || "";
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
    alert("Failed to export PDF. Check console for details.");
  }
});

// Helper: check current note type quickly from console
window.showNoteType = function () {
  console.log("currentNoteType:", window.currentNoteType);
};