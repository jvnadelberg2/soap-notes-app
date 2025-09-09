'use strict';

(function(){
  if (window.__EXPORT_WIRED__) return; window.__EXPORT_WIRED__ = true;

  function $(id){ return document.getElementById(id); }
  function getCurrentId(){ var el=$('current-note-id'); return el ? (el.value||'') : ''; }
  function noteFormat(){
    var sel = $('noteType'); var v = sel ? (sel.value || '').toLowerCase() : 'soap';
    return v === 'birp' ? 'birp' : 'soap';
  }
  function genUUID(){
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
      var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }
  function ensureDocUUIDField(){
    var el = document.getElementById('document_uuid');
    if (!el) {
      el = document.createElement('input');
      el.type = 'hidden';
      el.id = 'document_uuid';
      var anchor = $('current-note-id');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
      else document.body.appendChild(el);
    }
    return el;
  }
  function nextDocumentUUID(){
    var el = ensureDocUUIDField();
    el.value = genUUID();
    return el.value;
  }
  function getNoteUUID(){
    var el = document.getElementById('note_uuid');
    return el ? (el.value||'') : '';
  }

  function buildPdfUrl(id){
    var fmt = noteFormat();
    var docUuid = nextDocumentUUID();        // new per-export UUID
    var noteUuid = getNoteUUID();            // stable per-note UUID if you set it elsewhere
    var url = '/notes/'+encodeURIComponent(id)+'/pdf?format='+encodeURIComponent(fmt)
            + '&document_uuid=' + encodeURIComponent(docUuid);
    if (noteUuid) url += '&note_uuid=' + encodeURIComponent(noteUuid);
    return url;
  }

  async function onExport(){
    var id = getCurrentId();
    if (!id) { alert('Save the note first.'); return; }
    var url = buildPdfUrl(id);
    window.open(url, '_blank');
  }

  function wire(){
    // Grab the existing Export PDF button by id or by label
    var btn = $('exportPdf');
    if (!btn) {
      var candidates = Array.prototype.slice.call(document.querySelectorAll('button'));
      btn = candidates.find(function(b){ return /export\s*pdf/i.test((b.textContent||'')); }) || null;
    }
    if (!btn) return;

    // Replace to ensure our handler runs first
    var clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    clone.id = 'exportPdf';
    clone.addEventListener('click', onExport, {capture:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, {once:true});
  else wire();

  // Optional: expose getter so other code (e.g., FHIR export) can reuse the same per-export UUID if desired
  window.getDocumentUUID = function(){
    var el = document.getElementById('document_uuid');
    return el && el.value ? el.value : nextDocumentUUID();
  };
})();
