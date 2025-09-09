'use strict';
(function(){
  function tbody(){ return document.getElementById('notes-tbody'); }
  function applyFilter(q){
    var tb = tbody(); if (!tb) return;
    var rows = tb.querySelectorAll('tr');
    var qq = (q||'').toLowerCase();
    if (rows.forEach) rows.forEach(function(tr){
      var t = (tr.textContent||'').toLowerCase();
      var show = !qq || t.indexOf(qq) !== -1;
      tr.style.display = show ? '' : 'none';
    }); else Array.prototype.forEach.call(rows, function(tr){
      var t = (tr.textContent||'').toLowerCase();
      var show = !qq || t.indexOf(qq) !== -1;
      tr.style.display = show ? '' : 'none';
    });
  }
  function wire(){
    var input = document.getElementById('notes-search');
    var btn = document.getElementById('btn-search-notes');
    if (input){
      input.addEventListener('input', function(){ applyFilter(input.value); }, {passive:true});
      input.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); applyFilter(input.value); }});
    }
    if (btn){
      var clone = btn.cloneNode(true); btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener('click', function(){ applyFilter(input ? input.value : ''); if (input) input.focus(); }, {passive:true});
    }
    applyFilter(input ? input.value : '');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, {once:true}); else wire();
})();
