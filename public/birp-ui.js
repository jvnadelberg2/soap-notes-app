/* BEGIN:ARCH-COMMENT
File: public/birp-ui.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);

  const noteTypeEl = $('#noteType');
  const birpWrap = $('#birpFields');
  const outEl = $('#soapTextOut');
  const genBtn = $('#btnGenerate');

  const birp = {
    behavior: $('#birpBehavior'),
    intervention: $('#birpIntervention'),
    response: $('#birpResponse'),
    plan: $('#birpPlan'),
  };

  function toggle() {
    const isBIRP = (noteTypeEl?.value || '').toUpperCase() === 'BIRP';
    if (birpWrap) birpWrap.style.display = isBIRP ? '' : 'none';
    if (genBtn) genBtn.textContent = isBIRP ? 'Generate BIRP' : 'Generate SOAP';
  }

  async function generateBirp() {
    if (outEl) outEl.textContent = 'Generating BIRP…';
    const payload = {
      behavior: birp.behavior?.value?.trim() || '',
      intervention: birp.intervention?.value?.trim() || '',
      response: birp.response?.value?.trim() || '',
      plan: birp.plan?.value?.trim() || '',
      discipline: $('#discipline')?.value?.trim() || '',
      specialty: $('#specialty')?.value?.trim() || '',
      clinician: $('#provider')?.value?.trim() || '',
      clinic: $('#clinic')?.value?.trim() || '',
      useInference: !!document.getElementById('useInference')?.checked,
};
    };

    let resp;
    try {
      resp = await fetch('/api/generate-birp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      if (outEl) outEl.textContent = 'Error: could not reach server.';
      return;
    }

    if (!resp.ok) {
      const msg = await resp.text().catch(() => '');
      if (outEl) outEl.textContent = `Error ${resp.status}: ${msg}`;
      return;
    }

    const data = await resp.json().catch(() => ({}));
    const pretty = String(data?.birpText || data?.text || '').trim();
    if (outEl) outEl.textContent = pretty || 'No output.';
  }

  // Intercept Generate when BIRP is selected, without breaking SOAP handlers
  function onGenerateCapture(e) {
    const isBIRP = (noteTypeEl?.value || '').toUpperCase() === 'BIRP';
    if (!isBIRP) return; // let SOAP listeners run
    e.stopImmediatePropagation();
    e.preventDefault();
    generateBirp();
  }

  document.addEventListener('DOMContentLoaded', () => {
    toggle();
    if (noteTypeEl) noteTypeEl.addEventListener('change', toggle);
    if (genBtn) window.__birpBeforeGenerate = onGenerateCapture;; // capture to win when BIRP
  });
})();
