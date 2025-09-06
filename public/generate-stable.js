// public/generate-stable.js
// Wires the Generate SOAP button to the API and renders the note safely.

(() => {
  const $ = (id) => document.getElementById(id);

  const ids = [
    'patient','mrn','dob','sex','age',
    'chiefComplaint','hpi','pmh','fh','sh','ros',
    'vBP','vHR','vRR','vTemp','vWeight','vO2Sat',
    'diagnostics','exam',
    'provider','clinic','discipline','specialty','model','useInference'
  ];

  function collectBody() {
    const b = {};
    ids.forEach(id => {
      const el = $(id);
      if (!el) return;
      if (el.type === 'checkbox') b[id] = !!el.checked;
      else b[id] = (el.value ?? '').trim();
    });
    return b;
  }

  function normalizeObjective(o) {
    if (!o || !String(o).trim()) return 'No data provided.';
    const txt = String(o).trim();
    // Guard against any "all labels but empty values" variants:
    const looksEmptyVitals = /^BP:\s*,\s*HR:\s*,\s*RR:\s*,\s*Temp:\s*,\s*Weight:\s*,\s*O2\s*Sat:\s*:?$/i.test(txt);
    if (looksEmptyVitals) return 'No data provided.';
    return txt;
  }

  function renderSOAP(result) {
    const subj = (result?.subjective && String(result.subjective).trim()) || 'None provided.';
    const obj  = normalizeObjective(result?.objective);
    const asmt = (result?.assessment && String(result.assessment).trim()) || 'None provided.';
    const plan = (result?.plan && String(result.plan).trim()) || 'None provided.';

    const text =
`Subjective
${subj}

Objective
${obj}

Assessment
${asmt}

Plan
${plan}`;

    const out = $('soapTextOut');
    if (out) out.textContent = text;
  }

  async function generateSOAP() {
    const btn = $('btnGenerate');
    const status = $('status');
    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }
      if (status) status.textContent = 'Generating SOAP note…';

      const body = collectBody();

      const r = await fetch('/api/generate-soap-json-annotated', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await r.json();

      if (!data?.ok) throw new Error(data?.error || 'Failed to generate');

      renderSOAP(data.result);
      if (status) status.textContent = 'Done.';
    } catch (err) {
      console.error(err);
      if (status) status.textContent = 'Error generating note.';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Generate SOAP'; }
    }
  }

  function init() {
    const btn = $('btnGenerate');
    if (btn) btn.addEventListener('click', generateSOAP);

    const editableToggle = $('toggleEditable');
    const out = $('soapTextOut');
    if (editableToggle && out) {
      out.contentEditable = !!editableToggle.checked;
      editableToggle.addEventListener('change', () => {
        out.contentEditable = !!editableToggle.checked;
      });
    }
  }

  // init on DOM ready (handles defer-loaded script too)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
