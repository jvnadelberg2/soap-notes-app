/* BEGIN:ARCH-COMMENT
File: public/ui-list-tweaks.js
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
  function pretty(ts){
    if(!ts) return '';
    try{
      var t = String(ts).trim().replace(' ', 'T');
      var d = new Date(t);
      return d.toLocaleString([], {year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'}).replace(',', '');
    }catch(e){ return ts; }
  }
  function tweakHeader(){
    var th = document.querySelector('table thead tr');
    if (!th) return;
    var first = th.children[0];
    if (first && /id/i.test(first.textContent||'')) th.removeChild(first);
  }
  function tweakRows(){
    var tbody = $('notes-tbody'); if (!tbody) return;
    Array.prototype.forEach.call(tbody.querySelectorAll('tr'), function(tr){
      if (tr.dataset.tweaked === '1') return;
      var tds = tr.querySelectorAll('td');
      if (!tds || tds.length < 4) return;
      var id = (tds[0].textContent||'').trim();
      tds[0].parentNode.removeChild(tds[0]);
      var updatedCell = tr.querySelector('td:nth-child(3)');
      if (updatedCell) updatedCell.textContent = pretty(updatedCell.textContent||'');
      var actionsCell = tr.querySelector('td:last-child');
      if (actionsCell){
        var btn = document.createElement('button');
        btn.textContent = 'PDF';
        btn.style.marginLeft = '6px';
        btn.addEventListener('click', function(){
          var idEl = $('current-note-id'); if (idEl) idEl.value = id;
          var exportBtn = $('exportPdf'); if (exportBtn) exportBtn.click();
        }, {passive:true});
        actionsCell.appendChild(btn);
      }
      tr.dataset.tweaked = '1';
    });
    // DEL (per-row) — added right next to PDF, no other changes
var del = document.createElement('button');
del.textContent = 'DEL';
del.style.marginLeft = '6px';
del.addEventListener('click', async function(e){
  e.preventDefault();
  if (!confirm('Delete this note?')) return;
  try {
    var resp = await fetch('/api/notes/' + encodeURIComponent(id), { method: 'DELETE' });
    if (!resp.ok) { alert('Delete failed'); return; }
  } catch (_) { alert('Delete failed'); return; }

  // clear current selection if we deleted the loaded note
  var hid = document.getElementById('current-note-id');
  if (hid && hid.value === id) hid.value = '';

  // refresh the table so the row disappears
  if (window.refreshList) { try { await window.refreshList(); } catch(_){} }
}, { passive: true });

actionsCell.appendChild(del);

  }
  function wrapRefresh(){
    if (window.__listTweaksWrapped__) return;
    window.__listTweaksWrapped__ = true;
    var orig = window.refreshList;
    if (typeof orig !== 'function') { tweakHeader(); tweakRows(); return; }
    window.refreshList = async function(){
      var r = await orig.apply(this, arguments);
      tweakHeader();
      tweakRows();
      return r;
    };
  }
  function init(){
    wrapRefresh();
    tweakHeader();
    tweakRows();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
