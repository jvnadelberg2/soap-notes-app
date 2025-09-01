document.addEventListener('DOMContentLoaded',function(){
  var old = document.getElementById('btnClear'); if(!old) return;
  var btn = old.cloneNode(true); old.parentNode.replaceChild(btn, old);

  function setVal(id, v){
    var x = document.getElementById(id);
    if(!x) return;
    x.value = v || '';
    // fire input so any persistence listeners update
    x.dispatchEvent(new Event('input', {bubbles:true}));
    x.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function clearOut(id){
    var n = document.getElementById(id);
    if(!n) return;
    n.textContent = '';
    n.innerHTML = '';
  }

  btn.addEventListener('click', function(){
    setVal('patient','');
    setVal('rawText','');
    setVal('patientHistory','');
    setVal('labs','');
    setVal('imaging','');
    setVal('vBP','');
    setVal('vHR','');
    setVal('vRR','');
    clearOut('soapTextOut');
    var raw = document.getElementById('rawText'); if(raw) raw.focus();
  }, {once:false});
});