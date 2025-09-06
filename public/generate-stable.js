(function () {
  const $ = (id) => document.getElementById(id);

  const outEl = $("soapTextOut");
  const btnGenerate = $("btnGenerate");
  const useInferenceEl = $("useInference");

  function getVisible(el) {
    if (!el) return false;
    return window.getComputedStyle(el).display !== "none";
  }

  function getNoteType() {
    const sel = document.querySelector("[name='noteType']:checked") || $("noteType");
    if (sel && (sel.value || sel.dataset.value)) return (sel.value || sel.dataset.value).toLowerCase();
    const birpBox = $("birpFields");
    return getVisible(birpBox) ? "birp" : "soap";
  }

  function getSOAPPayload() {
    return {
      patient: ($("patient") || {}).value || "",
      chiefComplaint: ($("chiefComplaint") || {}).value || "",
      hpi: ($("hpi") || {}).value || "",
      pmh: ($("pmh") || {}).value || "",
      fh: ($("fh") || {}).value || "",
      sh: ($("sh") || {}).value || "",
      ros: ($("ros") || {}).value || "",
      vBP: ($("vBP") || {}).value || "",
      vHR: ($("vHR") || {}).value || "",
      vRR: ($("vRR") || {}).value || "",
      vTemp: ($("vTemp") || {}).value || "",
      vWeight: ($("vWeight") || {}).value || "",
      vO2Sat: ($("vO2Sat") || {}).value || "",
      diagnostics: ($("diagnostics") || {}).value || "",
      exam: ($("exam") || {}).value || "",
      useInference: !!(useInferenceEl && useInferenceEl.checked)
    };
  }

  function getBIRPPayload() {
    return {
      behavior: ($("birpBehavior") || {}).value || "",
      intervention: ($("birpIntervention") || {}).value || "",
      response: ($("birpResponse") || {}).value || "",
      plan: ($("birpPlan") || {}).value || "",
      useInference: !!(useInferenceEl && useInferenceEl.checked)
    };
  }

  async function postJSON(url, payload) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function onGenerate() {
    if (outEl) outEl.textContent = "Generating…";
    const noteType = getNoteType();

    try {
      if (noteType === "birp") {
        const payload = getBIRPPayload();
        const data = await postJSON("/api/generate-birp", payload);
        outEl.textContent = data.text || "";
        return;
      }

      // default: SOAP
      const payload = getSOAPPayload();
      const data = await postJSON("/api/generate-soap-json-annotated", payload);
      outEl.textContent = data.text || "";
    } catch (e) {
      if (outEl) outEl.textContent = `Error: ${e.message || e}`;
      console.error(e);
    }
  }

  if (btnGenerate) btnGenerate.addEventListener("click", onGenerate);
})();
