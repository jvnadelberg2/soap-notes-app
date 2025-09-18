/* Adds "Now" affordances to datetime-local inputs where appropriate */
(function(){
  function ensureType(id, type){ const el = document.getElementById(id); if (el && el.type !== type) el.type = type; return el; }
  function isoLocal(d){ const pad=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes()); }
  function addNowButton(id, label, fn){
    const el = document.getElementById(id); if (!el) return;
    const btn = document.createElement('button');
    btn.type='button'; btn.textContent=label; btn.style.marginLeft='6px';
    btn.addEventListener('click', ()=>{ el.value = fn(); el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); });
    el.insertAdjacentElement('afterend', btn);
  }

  var tIn = ensureType('timeIn','datetime-local');
  var tOut= ensureType('timeOut','datetime-local');
  var enc = ensureType('encounterAt','datetime-local');
  var tca = ensureType('teleConsentAt','datetime-local');

  if (tIn)  addNowButton('timeIn','Now', ()=>isoLocal(new Date()));
  if (tOut) addNowButton('timeOut','Now', ()=>isoLocal(new Date()));
  if (enc)  addNowButton('encounterAt','Now', ()=>isoLocal(new Date()));
  if (tca)  addNowButton('teleConsentAt','Now', ()=>isoLocal(new Date()));
})();