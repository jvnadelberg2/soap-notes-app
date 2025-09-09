'use strict';
(function(){
  function clearDomTable(){
    var tb = document.getElementById('notes-tbody');
    if (tb) tb.innerHTML = '';
  }
  function wire(){
    var btn = document.getElementById('btn-clear-notes'); if (!btn) return;
    var clone = btn.cloneNode(true); btn.parentNode.replaceChild(clone, btn);
    clone.addEventListener('click', async function(){
      if(!confirm('Delete all notes on this device?')) return;
      try { await fetch('/api/notes', { method:'DELETE' }); } catch(e) {}
      try{
        var keys = Object.keys(localStorage);
        for (var i=0;i<keys.length;i++){
          var k = keys[i];
          if (k === 'notes' || k.indexOf('note:') === 0 || k.indexOf('notes:') === 0 || /(^|:)notes?\b/i.test(k)) {
            localStorage.removeItem(k);
          }
        }
      }catch(e){}
      clearDomTable();
      if (typeof window.refreshList === 'function') { try { window.refreshList(); } catch(_) {} }
      var c = document.getElementById('current-note-id'); if (c) c.value = '';
    }, { passive:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once:true });
  else wire();
})();
