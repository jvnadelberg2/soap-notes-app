/* BEGIN:ARCH-COMMENT
File: public/save-guard.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';
(function(){
  function $(id){ return document.getElementById(id); }
  function wire(){
    var btn = $('btn-save-note'); if (!btn) return;
    var clone = btn.cloneNode(true); btn.parentNode.replaceChild(clone, btn);
    clone.addEventListener('click', function(){
      if (window.__saveInFlight) return;
      var idEl = $('current-note-id'); if (idEl) idEl.value = '';
      if (typeof window.saveNote !== 'function') { console.warn('saveNote is not available'); return; }
      window.__saveInFlight = true;
      clone.disabled = true;
      Promise.resolve()
        .then(function(){ return window.saveNote(); })
        .finally(function(){
          window.__saveInFlight = false;
          clone.disabled = false;
        });
    }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once: true });
  else wire();
})();
