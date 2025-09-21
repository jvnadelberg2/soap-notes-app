/* BEGIN:ARCH-COMMENT
File: public/speciality-loader.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';
(function(){
  function $(q){ return document.querySelector(q); }

  async function jget(url){
    if (typeof window.jget === 'function') return window.jget(url);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('GET failed: ' + url);
    return r.json();
  }

  function setOptions(sel, list, selected){
    if (typeof window.setOptions === 'function') return window.setOptions(sel, list, selected);
    sel.innerHTML = '';
    for (var i=0;i<list.length;i++){
      var v = String(list[i] == null ? '' : list[i]);
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    }
    sel.value = selected || '';
  }

  async function loadSpecialties(){
    var sel = $("#specialty");
    if(!sel) return;
    try{
      var j = await jget("/api/specialties");
      var list = Array.isArray(j.specialties) ? j.specialties.slice().sort(function(a,b){ return String(a).localeCompare(String(b)); }) : ["General Practice"];
      var def = (localStorage.getItem('specialty') || list[0] || "General Practice");
      setOptions(sel, list, def);
      var c = $("#specCount");
      if(c) c.textContent = list.length + " specialties loaded (alphabetical)";
    }catch{
      setOptions(sel, ["General Practice"], "General Practice");
      var c2 = $("#specCount");
      if(c2) c2.textContent = "1 specialty loaded";
    }
    sel.addEventListener('change', function(){
      try{ localStorage.setItem('specialty', sel.value || ''); }catch(_){}
    }, { passive:true });
    window.getSpecialty = function(){ return (sel && sel.value) || ''; };
  }

  function ensureSelectExists(){
    var sel = $("#specialty");
    if (sel) return;
    var field = document.createElement('div');
    field.className = 'field';
    var lbl = document.createElement('label');
    lbl.setAttribute('for','specialty');
    lbl.textContent = 'Specialty';
    sel = document.createElement('select');
    sel.id = 'specialty'; sel.name = 'specialty';
    var count = document.createElement('div');
    count.id = 'specCount'; count.className = 'muted';
    field.appendChild(lbl); field.appendChild(sel); field.appendChild(count);

    var anchor = $("#noteType") || $("#note-format") || document.querySelector('.field');
    if (anchor && anchor.closest) {
      var wrap = anchor.closest('.field') || anchor.parentElement;
      if (wrap && wrap.parentNode) wrap.parentNode.insertBefore(field, wrap.nextSibling);
      else document.body.appendChild(field);
    } else {
      document.body.appendChild(field);
    }
  }

  function boot(){
    ensureSelectExists();
    loadSpecialties();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
