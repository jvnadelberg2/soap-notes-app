/* BEGIN:ARCH-COMMENT
File: public/new-note-id-reset.js
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
    var btn = document.getElementById('btnClear'); if (!btn) return;
    if (btn.dataset.resetIdBound === '1') return;
    btn.dataset.resetIdBound = '1';
    btn.addEventListener('click', function(){
      var idEl = $('current-note-id'); if (idEl) idEl.value = '';
    }, { passive:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once:true });
  else wire();
})();
