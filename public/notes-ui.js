/* BEGIN:ARCH-COMMENT
File: public/notes-ui.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';
(function(){
  if (window.__NOTES_UI_WIRED__) return; window.__NOTES_UI_WIRED__ = true;

  function $(id){ return document.getElementById(id); }

  function wire(){
    // Keep a live filter typing experience if you have a search input
    var q = $('notes-search');
    if (q && typeof window.refreshList === 'function') {
      q.addEventListener('input', function(){
        // Defer to server-backed refresh if present; otherwise no-op
        try { window.refreshList(); } catch(e){}
      }, { passive: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once: true });
  else wire();
})();
