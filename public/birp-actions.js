/*"use strict";

async function generateBIRP() {
  const body = {
    assistLevel: Number(document.getElementById("assistLevel")?.value || 0),
    birpBehavior: document.getElementById("birpBehavior")?.value || "",
    birpIntervention: document.getElementById("birpIntervention")?.value || "",
    birpResponse: document.getElementById("birpResponse")?.value || "",
    birpPlan: document.getElementById("birpPlan")?.value || "",
    model: document.getElementById("llmModel")?.value || ""
  };

  try {
    const res = await fetch("/api/birp-enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.generatedNote) {
      document.getElementById("generatedNote").value = data.generatedNote;
    } else {
      document.getElementById("generatedNote").value =
        "Error: " + (data.error || "BIRP generation failed");
    }
  } catch (e) {
    document.getElementById("generatedNote").value = "Error: " + e.message;
  }
}

document.getElementById("generateNote")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (document.getElementById("noteType")?.value === "birp") {
    generateBIRP();
  }
});


*/