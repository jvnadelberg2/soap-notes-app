/* eslint-disable */
// NOTE: single-file replacement to ensure Clear truly resets UI + internal state.

(function(){
  'use strict';

  const byId = (id) => document.getElementById(id);

  function clearInputs() {
    const ids = [
      // common patient fields
      'patient','patientName','mrn','dob','sex','provider','clinic','npi','location',
      // SOAP fields
      'chiefComplaint','hpi','pmh','fh','sh','ros','vBP','vHR','vRR','vTemp','vWeight','vO2Sat','height','painScore','diagnostics','exam','allergies','medications','noteText',
      // BIRP fields
      'birpBehavior','birpIntervention','birpResponse','birpPlan'
    ];
    ids.forEach(id => {
      const el = byId(id);
      if (!el) return;
      if ('value' in el) el.value = '';
      if (el.tagName === 'TEXTAREA') el.value = '';
    });
  }

  function clearOutputs() {
    ['soapTextOut','birpTextOut','noteTextOut'].forEach(id => {
      const el = byId(id);
      if (el) el.textContent = '';
    });
  }

  function clearState() {
    if (window.currentNote && typeof window.currentNote === 'object') {
      for (const k of Object.keys(window.currentNote)) delete window.currentNote[k];
    }
    window.currentUUID = null;
    try { localStorage.removeItem('currentNote'); } catch {}
    try { sessionStorage.removeItem('currentNote'); } catch {}
  }

  function wire() {
    const btn = byId('btnClear');
    if (!btn) return;
    btn.addEventListener('click', function(){
      clearInputs();
      clearOutputs();
      clearState();
      if (typeof window.refreshList === 'function') { try { window.refreshList(); } catch {} }
    }, { passive:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once:true });
  } else {
    wire();
  }
})();
