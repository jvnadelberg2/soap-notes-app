'use strict';

(function(){
  if (window.__EXPORT_WIRED__) return; window.__EXPORT_WIRED__ = true;

  function $(id){ return document.getElementById(id); }
  function getCurrentId(){ var el=$('current-note-id'); return el ? (el.value||'') : ''; }
  function noteFormat(){
    var sel = $('noteType'); var v = sel ? (sel.value || '').toLowerCase() : 'soap';
    return v === 'birp' ? 'birp' : 'soap';
  }

  async function onExport(){
    var id = getCurrentId();
    if (!id) { alert('Save the note first.'); return; }
    var fmt = noteFormat();
    window.open('/notes/'+encodeURIComponent(id)+'/pdf?format='+encodeURIComponent(fmt), '_blank');
  }

  function wire(){
    var btn = $('exportPdf') || Array.from(document.querySelectorAll('button')).find(function(b){ return /export\s*pdf/i.test((b.textContent||'')); });
    if (!btn) return;
    var clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    clone.id = 'exportPdf';
    clone.addEventListener('click', onExport, {capture:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, {once:true}); else wire();
})();
