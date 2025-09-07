'use strict';

(function(){
  if (window.__DT_NOW_WIRED__) return; window.__DT_NOW_WIRED__=true;

  function $(id){ return document.getElementById(id); }
  function isoLocal(dt){
    const d = dt || new Date();
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function today(d){
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function ensureType(id, type){
    var el=$(id); if(!el) return null;
    try{ el.type = type; }catch{}
    return el;
  }
  function addNowButton(inputId, label, getVal){
    var el=$(inputId); if(!el) return;
    var wrap=document.createElement('span'); wrap.style.display='inline-flex'; wrap.style.gap='6px'; wrap.style.alignItems='center';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    var btn=document.createElement('button'); btn.type='button'; btn.textContent=label; btn.style.padding='6px 8px';
    btn.addEventListener('click', function(){ el.value = getVal(); el.dispatchEvent(new Event('input')); });
    wrap.appendChild(btn);
  }

  function wire(){
    var e = ensureType('encounter','datetime-local');
    var f = ensureType('finalizedAt','datetime-local');
    var ti = ensureType('timeIn','datetime-local');
    var to = ensureType('timeOut','datetime-local');
    var dob = ensureType('dob','date');

    if (e) addNowButton('encounter','Now', ()=>isoLocal(new Date()));
    if (f) addNowButton('finalizedAt','Now', ()=>isoLocal(new Date()));
    if (ti) addNowButton('timeIn','Now', ()=>isoLocal(new Date()));
    if (to) addNowButton('timeOut','Now', ()=>isoLocal(new Date()));
    if (dob) addNowButton('dob','Today', ()=>today(new Date()));
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', wire, {once:true});
  else wire();
})();
