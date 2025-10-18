"use strict";

/* ------------------ Small UX Helpers ------------------ */
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
    provider: document.getElementById("provider")?.value || "",
  };

  // --- Review of Systems ---
  const rosChecks = Array.from(document.querySelectorAll("#ros input[type=checkbox]:checked")).map(
    (el) => el.value
  );
  const rosComments = document.getElementById("ros-comments")?.value || "";

  body.ros = rosChecks;
  body.rosComments = rosComments;

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
            .map((s) => `${s.code} — ${s.description}`)
            .join("\n");
        }
      }
    } else {
      document.getElementById("generatedNote").value = "Error: SOAP generation returned no data";
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
    provider: document.getElementById("provider")?.value || "",
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
      document.getElementById("generatedNote").value = "Error: BIRP generation returned no data";
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
  if (noteType === "soap") generateSOAP();
  else if (noteType === "birp") generateBIRP();
});

/* ------------------ Export PDF ------------------ */
document.getElementById("exportPdf")?.addEventListener("click", async (e) => {
  e.preventDefault();
  flashButton(e.currentTarget);

  try {
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
      subjective: document.getElementById("chiefComplaint")?.value || "",
      objective: document.getElementById("physicalExam")?.value || "",
      ros: Array.from(document.querySelectorAll("#ros input[type=checkbox]:checked")).map((el) => el.value),
      rosComments: document.getElementById("ros-comments")?.value || "",
      icd_codes:
        document.getElementById("icd-box")?.textContent
          ?.split("\n")
          .map((x) => x.trim())
          .filter((x) => x.length) || [],
      generatedNote: document.getElementById("generatedNote")?.value || "",
    };

    console.log("[exportPdf] sending payload:", payload);

    const res = await fetch("/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Export failed: ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (err) {
    console.error("[exportPdf] Error:", err);
    alert("Failed to export PDF: " + err.message);
  }
});

/* ------------------ Sign & Clear ------------------ */
document.addEventListener("DOMContentLoaded", () => {
  ensureLoadingIndicator();

  const signBtn = document.getElementById("signNote");
  const clearBtn = document.getElementById("clearPatient");
  let isSigned = false;

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
          noteType: window.currentNoteType || "",
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        signBtn.textContent = "Signed";
        signBtn.style.backgroundColor = "pink";
        signBtn.disabled = true;
        isSigned = true;
      } else {
        alert("Signing failed: " + (data.error || "unknown error"));
      }
    } catch (err) {
      console.error("Sign error:", err);
      alert("Error signing note: " + err.message);
    }
  }

  function clearPatientData() {
    const keep = ["provider", "credentials", "npi", "clinic", "assistLevel", "specialty", "noteType"];
    document.querySelectorAll("input, textarea, select").forEach((el) => {
      if (!keep.includes(el.id)) {
        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else if (el.type === "checkbox" || el.type === "radio") el.checked = false;
        else el.value = "";
      }
    });
    const icdBox = document.getElementById("icd-box");
    if (icdBox) icdBox.textContent = "";
    document.getElementById("generatedNote").value = "";
  }

  if (signBtn) signBtn.addEventListener("click", handleSign);
  if (clearBtn) clearBtn.addEventListener("click", clearPatientData);
});