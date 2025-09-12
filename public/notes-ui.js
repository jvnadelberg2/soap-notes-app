
'use strict';
(function(){
  if (window.__NOTES_UI_WIRED__) return; window.__NOTES_UI_WIRED__ = true;

  function $(id){ return document.getElementById(id); }

  function wire(){
    var q = $('notes-search');
    if (q && typeof window.refreshList === 'function') {
      q.addEventListener('input', function(){
        try { window.refreshList(); } catch(e){}
      }, { passive: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once: true });
  else wire();
})();
